// Social-Radar – Hintergrund: holt Kanaldaten über die offizielle YouTube Data API v3.
// Netzwerkverbindungen: https://www.googleapis.com/youtube/v3/ mit Andrés eigenem API-Schlüssel und – seit v2.2
// (André-Freigabe 2026-11-17) – YouTubes Bildserver https://i.ytimg.com/ für Thumbnails (Anzeige, Download, Wechsel-Erkennung).
// Ergebnisse liegen pro Kanal und Bereich im lokalen Zwischenspeicher (Standard 6 Stunden), damit nur selten abgefragt wird.
importScripts("kern.js");

const API = "https://www.googleapis.com/youtube/v3/";
const STANDARD = { maxVideos: 200, cacheStunden: 6 };

// Klick auf das Symbol: Vergleichs-Dashboard (M5); Einstellungen von dort oder über die Erweiterungsverwaltung
const dashboard = () => chrome.tabs.create({ url: chrome.runtime.getURL("radar-dashboard.html") });
chrome.action.onClicked.addListener(dashboard);

chrome.runtime.onMessage.addListener((nachricht, _absender, antwort) => {
  if (nachricht.typ === "einstellungen") { chrome.runtime.openOptionsPage(); return; }
  if (nachricht.typ === "dashboard") { dashboard(); return; }
  if (nachricht.typ === "kanal") { kanal(nachricht).then(antwort, f => antwort({ fehler: f.message })); return true; }
  if (nachricht.typ === "video") { video(nachricht).then(antwort, f => antwort({ fehler: f.message })); return true; }
  if (nachricht.typ === "thumbnail") { thumbnailLaden(nachricht.id).then(antwort, f => antwort({ fehler: f.message })); return true; }
  if (nachricht.typ === "jetztNachladen") { nachladen({ vonHand: true }).then(antwort, f => antwort({ fehler: f.message })); return true; }
  if (nachricht.typ === "tracken") { tracken(nachricht).then(antwort, f => antwort({ fehler: f.message })); return true; }
  if (nachricht.typ === "verbrauch") { verbrauch().then(v => antwort({ ...v, kontingent: KONTINGENT, autoBudget: AUTO_BUDGET })); return true; }
  if (nachricht.typ === "schluesselTesten") { schluesselTesten(nachricht.schluessel).then(antwort, f => antwort({ fehler: f.message })); return true; }
});

async function einstellungen() {
  const { einstellungen = {} } = await chrome.storage.local.get("einstellungen");
  return { ...STANDARD, ...einstellungen };
}

// Schlüssel im Kopf statt in der Adresse, damit er nicht in Verläufen oder Protokollen auftaucht
async function api(pfad, werte, schluessel) {
  const url = new URL(API + pfad);
  Object.entries(werte).forEach(([k, v]) => url.searchParams.set(k, v));
  await verbrauchBuchen(1);   // jede Anfrage an channels / playlistItems / videos kostet 1 Einheit
  const r = await fetch(url, { headers: { "X-Goog-Api-Key": schluessel } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const grund = j.error?.errors?.[0]?.reason || "";
    const f = new Error(fehlerText(r.status, grund, j.error?.message));
    f.status = r.status; f.grund = grund;
    throw f;
  }
  return j;
}

function fehlerText(status, grund, text) {
  if (grund === "quotaExceeded") return "Das Tageskontingent der YouTube-API ist aufgebraucht. Ab 9 Uhr (deutsche Zeit) geht es wieder.";
  if (grund === "keyInvalid" || /API key not valid/i.test(text || "")) return "Der API-Schlüssel ist ungültig. Prüfe ihn in den Einstellungen.";
  if (grund === "accessNotConfigured" || /has not been used|is disabled/i.test(text || "")) return "Für diesen Schlüssel ist die „YouTube Data API v3“ noch nicht aktiviert.";
  if (status === 403) return "YouTube verweigert den Zugriff (403). Prüfe Schlüssel und Freigaben in der Google Cloud.";
  return `YouTube-API-Fehler ${status}${text ? ": " + text : ""}`;
}

async function schluesselTesten(schluessel) {
  const j = await api("channels", { part: "id", forHandle: "@YouTube" }, schluessel);
  return { ok: !!j.items?.length };
}

// nachricht: { typ: "kanal", handle?: "@name", kanalId?: "UC…", bereich: "videos" | "shorts", neu?: true }
async function kanal({ handle, kanalId, bereich, neu }) {
  const { schluessel } = await chrome.storage.local.get("schluessel");
  if (!schluessel) return { ohneSchluessel: true };
  const einst = await einstellungen();
  const merkName = `cache:${(handle || kanalId).toLowerCase()}:${bereich}`;
  if (!neu) {
    const alt = (await chrome.storage.local.get(merkName))[merkName];
    if (alt && Date.now() - alt.geladenAm < einst.cacheStunden * 3600000 && alt.max === einst.maxVideos) return alt;
  }
  const daten = await kanalLaden({ handle, kanalId, bereich, max: einst.maxVideos, schluessel });
  await chrome.storage.local.set({ [merkName]: daten });
  await verlaufSchreiben(daten.kanal.id, daten.videos).catch(() => { });
  return daten;
}

// Einzelnes Video für die Leiste unter dem Player: 1 Einheit, im Zwischenspeicher wie die Kanäle
async function video({ id, neu }) {
  const { schluessel } = await chrome.storage.local.get("schluessel");
  if (!schluessel) return { ohneSchluessel: true };
  const einst = await einstellungen();
  const merkName = `video:${id}`;
  if (!neu) {
    const alt = (await chrome.storage.local.get(merkName))[merkName];
    if (alt && Date.now() - alt.geladenAm < einst.cacheStunden * 3600000) return alt;
  }
  const v = (await api("videos", { part: "snippet,statistics,contentDetails", id }, schluessel)).items?.[0];
  if (!v) throw new Error("Dieses Video findet die YouTube-API nicht.");
  const daten = {
    id: v.id, titel: v.snippet.title, kanalId: v.snippet.channelId, kanalName: v.snippet.channelTitle,
    datum: v.snippet.publishedAt, tags: v.snippet.tags || [],
    views: +(v.statistics.viewCount || 0),
    likes: v.statistics.likeCount != null ? +v.statistics.likeCount : null,
    kommentare: v.statistics.commentCount != null ? +v.statistics.commentCount : null,
    dauerSek: RadarKern.dauerSek(v.contentDetails.duration), geladenAm: Date.now()
  };
  await chrome.storage.local.set({ [merkName]: daten });
  await verlaufSchreiben(daten.kanalId, [daten]).catch(() => { });
  return daten;
}

// ---------- API-Budget (v2.3, André 2026-11-17) ----------
// Tageskontingent der YouTube-API: 10.000 Einheiten, Neustart um Mitternacht Pazifikzeit (9 Uhr deutscher Zeit).
// Automatische Abrufe (Nachladen, Video-Tracking) dürfen höchstens AUTO_BUDGET verbrauchen – der Rest bleibt immer
// als Puffer fürs eigene Öffnen von Kanälen frei. Speicher: apiVerbrauch = { tag, einheiten, auto }
const KONTINGENT = 10000, AUTO_BUDGET = 2000;
let autoLauf = false;
const tagPT = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
async function verbrauch() {
  const { apiVerbrauch } = await chrome.storage.local.get("apiVerbrauch");
  return apiVerbrauch?.tag === tagPT() ? apiVerbrauch : { tag: tagPT(), einheiten: 0, auto: 0 };
}
async function verbrauchBuchen(n) {
  const v = await verbrauch();
  v.einheiten += n; if (autoLauf) v.auto += n;
  await chrome.storage.local.set({ apiVerbrauch: v });
}
async function autoErlaubt(kosten) {
  const v = await verbrauch();
  return v.auto + kosten <= AUTO_BUDGET && v.einheiten + kosten <= KONTINGENT * 0.8;
}

// ---------- Kanal-Verlauf: Gesamt-Views und Abonnenten (für „Views des Kanals in 7 / 30 Tagen“) ----------
// vk:<kanalId> = [[Zeit, Gesamt-Views, Abonnenten, Videos], …] – höchstens ein Punkt je 6 Stunden, max. 400
async function kanalVerlaufSchreiben(ch) {
  const name = "vk:" + ch.id, jetzt = Date.now();
  const liste = (await chrome.storage.local.get(name))[name] || [];
  const punkt = [jetzt, +(ch.statistics.viewCount || 0), ch.statistics.hiddenSubscriberCount ? null : +(ch.statistics.subscriberCount || 0), +(ch.statistics.videoCount || 0)];
  if (liste.length && jetzt - liste[liste.length - 1][0] < 6 * 3600000) liste[liste.length - 1] = punkt; else liste.push(punkt);
  await chrome.storage.local.set({ [name]: liste.slice(-400) });
}

// ---------- Video-Verlauf (v2.2, in Entwicklung) ----------
// Bei jedem Abruf ein Messpunkt je Video der letzten 30 Tage: [Zeit, Views, Likes, Kommentare] – höchstens alle 30 Minuten.
// Dazu das Thumbnail: Bild holen, Prüfsumme bilden; ändert sie sich, wird die neue Version (klein, als Bild) gespeichert.
// YouTube behält die Bild-Adresse bei einem Tausch bei – erkennbar ist ein Wechsel nur am Bild selbst.
// Speicher: „vv:<kanalId>“ = { <videoId>: { d: Datum, p: [[t, views, likes, kommentare], …], b: [{ t, h, d: Bild }], bt: letzte Bildprüfung } }
const VERLAUF_TAGE = 30, MESS_ABSTAND = 30 * 60000;
const bildAdresse = (id, groesse = "mqdefault") => `https://i.ytimg.com/vi/${id}/${groesse}.jpg`;
async function bildMitPruefsumme(id) {
  const r = await fetch(bildAdresse(id), { cache: "no-store" });
  if (!r.ok) throw new Error("Thumbnail nicht erreichbar");
  const puffer = await r.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", puffer))].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
  let bin = ""; new Uint8Array(puffer).forEach(b => { bin += String.fromCharCode(b); });
  return { hash, bild: "data:image/jpeg;base64," + btoa(bin) };
}
async function verlaufSchreiben(kanalId, videos, { erzwingen = false } = {}) {
  if (!kanalId || !videos?.length) return;
  const name = "vv:" + kanalId, jetzt = Date.now();
  const alt = (await chrome.storage.local.get(name))[name] || {};
  const frisch = videos.filter(v => v.datum && (jetzt - new Date(v.datum).getTime()) / 864e5 <= VERLAUF_TAGE);
  await Promise.all(frisch.map(async v => {
    const e = alt[v.id] ||= { d: v.datum, p: [], b: [] };
    const letzter = e.p[e.p.length - 1];
    // Zeitpunkt-Messungen (erzwingen) dürfen dichter liegen – aber nie dichter als 15 Minuten, sonst wird der letzte Punkt ersetzt
    if (!letzter || jetzt - letzter[0] >= (erzwingen ? 15 * 60000 : MESS_ABSTAND)) e.p.push([jetzt, v.views, v.likes, v.kommentare]);
    else if (v.views > letzter[1]) e.p[e.p.length - 1] = [letzter[0], v.views, v.likes, v.kommentare];
    e.p = e.p.slice(-400);
    if (!erzwingen && (!e.bt || jetzt - e.bt >= MESS_ABSTAND)) {
      try {
        const b = await bildMitPruefsumme(v.id); e.bt = jetzt;
        if (e.b[e.b.length - 1]?.h !== b.hash) e.b.push({ t: jetzt, h: b.hash, d: b.bild });
        e.b = e.b.slice(-6);
      } catch { /* Bildserver nicht erreichbar: nächster Versuch beim nächsten Abruf */ }
    }
  }));
  // Videos, die älter als 45 Tage sind, fallen aus dem Verlauf (die Gesamtzahlen bleiben im Kanal-Zwischenspeicher)
  Object.keys(alt).forEach(id => { if ((jetzt - new Date(alt[id].d).getTime()) / 864e5 > 45) delete alt[id]; });
  await chrome.storage.local.set({ [name]: alt });
}

// Thumbnail in bester verfügbarer Auflösung als Bild zum Herunterladen
async function thumbnailLaden(id) {
  for (const g of ["maxresdefault", "sddefault", "hqdefault", "mqdefault"]) {
    const r = await fetch(bildAdresse(id, g));
    if (!r.ok) continue;
    const blob = await r.blob();
    if (g === "maxresdefault" && blob.size < 2000) continue;   // YouTubes Platzhalter, wenn es keine Maximalauflösung gibt
    const puffer = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; puffer.forEach(b => { bin += String.fromCharCode(b); });
    return { bild: "data:image/jpeg;base64," + btoa(bin), groesse: g };
  }
  throw new Error("Kein Thumbnail gefunden.");
}

// ---------- Automatisch nachladen (v2.3, in Entwicklung, nur auf Wunsch) ----------
// André hakt einzelne gespeicherte YouTube-Kanäle an (höchstens 10). Einmal täglich (André, 2026-11-17: „beim Kanal
// reicht täglich“) und sparsam: nur Kanal-Kennzahlen und die neuesten 50 Videos und Shorts (≈ 5 Einheiten je Kanal),
// zusammengeführt mit dem bestehenden Zwischenspeicher. Läuft nur, solange Chrome läuft; verpasste Läufe holt Chrome
// beim nächsten Start nach. Speicher: autoNachladen = { kanaele: [{ kanalId, handle }] }, autoNachladenStand.
const AUTO_MAX = 10, KOSTEN_SPARSAM = 5;
async function weckerStellen() {
  const { autoNachladen, getrackt } = await chrome.storage.local.get(["autoNachladen", "getrackt"]);
  await chrome.alarms.clear("nachladen");
  if (autoNachladen?.kanaele?.length) chrome.alarms.create("nachladen", { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  await chrome.alarms.clear("meilensteine");
  if (Object.keys(getrackt || {}).length) chrome.alarms.create("meilensteine", { periodInMinutes: 15, delayInMinutes: 1 });
}
// Neueste Einträge holen und in den Zwischenspeicher einsortieren (ältere Videos behalten ihren letzten Stand)
async function kanalSparsam({ handle, kanalId }) {
  const { schluessel } = await chrome.storage.local.get("schluessel");
  if (!schluessel) return { ohneSchluessel: true };
  const einst = await einstellungen();
  const ergebnis = {};
  for (const bereich of ["videos", "shorts"]) {
    const merkName = `cache:${(handle || kanalId).toLowerCase()}:${bereich}`;
    const alt = (await chrome.storage.local.get(merkName))[merkName];
    if (!alt) { ergebnis[bereich] = await kanal({ handle, kanalId, bereich, neu: true }); continue; }
    const frisch = await kanalLaden({ handle, kanalId, bereich, max: 50, schluessel });
    const bekannt = new Set(frisch.videos.map(v => v.id));
    const daten = { ...alt, kanal: frisch.kanal, videos: [...frisch.videos, ...alt.videos.filter(v => !bekannt.has(v.id))].slice(0, einst.maxVideos), geladenAm: Date.now(), teilweise: true };
    await chrome.storage.local.set({ [merkName]: daten });
    await verlaufSchreiben(daten.kanal.id, frisch.videos).catch(() => { });
    ergebnis[bereich] = daten;
  }
  return ergebnis;
}
async function nachladen({ vonHand = false } = {}) {
  const { autoNachladen } = await chrome.storage.local.get("autoNachladen");
  const liste = (autoNachladen?.kanaele || []).slice(0, AUTO_MAX);
  const fehler = []; let geladen = 0;
  autoLauf = !vonHand;
  try {
    for (const k of liste) {
      if (!vonHand && !(await autoErlaubt(KOSTEN_SPARSAM * 2))) { fehler.push("Tagesbudget für automatische Abrufe erreicht – Rest morgen."); break; }
      try {
        const a = await kanalSparsam({ handle: k.handle || undefined, kanalId: k.handle ? undefined : k.kanalId });
        if (a?.ohneSchluessel) { fehler.push("Kein API-Schlüssel hinterlegt."); break; }
        const f = Object.values(a).find(x => x?.fehler); if (f) fehler.push(f.fehler); else geladen++;
      } catch (f) { fehler.push(f.message); if (f.grund === "quotaExceeded") break; }
    }
  } finally { autoLauf = false; }
  const stand = { zeit: Date.now(), anzahl: liste.length, geladen, ok: !fehler.length, fehler: fehler[0] || "" };
  await chrome.storage.local.set({ autoNachladenStand: stand });
  return stand;
}

// ---------- Video-Tracking zu festen Zeitpunkten (v2.3, André 2026-11-17) ----------
// „Wie hat sich ein Video in der ersten Stunde, den ersten 4, 8, 12 Stunden entwickelt“ ist aussagekräftiger als stündlich.
// André markiert einzelne Videos (höchstens 20). Alle 15 Minuten prüft der Wecker, ob ein Zeitpunkt fällig ist; fällige
// Videos werden gebündelt abgefragt (1 Einheit für bis zu 50 Videos). War Chrome zum Zeitpunkt aus, wird beim nächsten
// Wecken gemessen – mit der tatsächlichen Uhrzeit. Nach 7 Tagen endet das Tracking von selbst.
// Speicher: getrackt = { <videoId>: { kanalId, titel, datum, seit, messungen: { <Stunden>: [Zeit, Views] } } }
const MEILENSTEINE = [1, 4, 8, 12, 24, 48, 168], TRACK_MAX = 20;
async function tracken({ id, kanalId, titel, datum, an }) {
  const { getrackt = {} } = await chrome.storage.local.get("getrackt");
  if (an) {
    if (!getrackt[id] && Object.keys(getrackt).length >= TRACK_MAX) return { fehler: `Höchstens ${TRACK_MAX} Videos gleichzeitig.` };
    getrackt[id] ||= { kanalId, titel, datum, seit: Date.now(), messungen: {} };
  } else delete getrackt[id];
  await chrome.storage.local.set({ getrackt });
  await weckerStellen();
  if (an) meilensteinePruefen().catch(() => { });
  return { ok: true, anzahl: Object.keys(getrackt).length };
}
async function meilensteinePruefen() {
  const { getrackt = {}, schluessel } = await chrome.storage.local.get(["getrackt", "schluessel"]);
  if (!schluessel) return;
  const jetzt = Date.now(), faellig = [];
  for (const [id, t] of Object.entries(getrackt)) {
    const std = (jetzt - new Date(t.datum).getTime()) / 36e5;
    if (std > 168 + 12) { delete getrackt[id]; continue; }   // Tracking endet nach 7 Tagen
    if (MEILENSTEINE.some(m => std >= m && !t.messungen[m]) || !Object.keys(t.messungen).length) faellig.push(id);
  }
  if (faellig.length && await autoErlaubt(1)) {
    autoLauf = true;
    try {
      for (let i = 0; i < faellig.length; i += 50) {
        const j = await api("videos", { part: "statistics", id: faellig.slice(i, i + 50).join(","), maxResults: 50 }, schluessel);
        const proKanal = {};
        for (const v of j.items || []) {
          const t = getrackt[v.id], views = +(v.statistics.viewCount || 0), std = (jetzt - new Date(t.datum).getTime()) / 36e5;
          // jeder erreichte, noch offene Zeitpunkt bekommt diese Messung – mit tatsächlicher Uhrzeit
          MEILENSTEINE.filter(m => std >= m && !t.messungen[m]).forEach(m => { t.messungen[m] = [jetzt, views]; });
          if (!Object.keys(t.messungen).length) t.messungen.start = [jetzt, views];
          (proKanal[t.kanalId] ||= []).push({ id: v.id, datum: t.datum, views, likes: v.statistics.likeCount != null ? +v.statistics.likeCount : null, kommentare: v.statistics.commentCount != null ? +v.statistics.commentCount : null });
        }
        for (const [kanalId, videos] of Object.entries(proKanal)) await verlaufSchreiben(kanalId, videos, { erzwingen: true }).catch(() => { });
      }
    } finally { autoLauf = false; }
  }
  await chrome.storage.local.set({ getrackt });
  if (!Object.keys(getrackt).length) chrome.alarms.clear("meilensteine");
}
chrome.alarms.onAlarm.addListener(a => { if (a.name === "nachladen") nachladen(); if (a.name === "meilensteine") meilensteinePruefen(); });
chrome.storage.onChanged.addListener(c => { if (c.autoNachladen) weckerStellen(); });
chrome.runtime.onStartup.addListener(weckerStellen);
chrome.runtime.onInstalled.addListener(weckerStellen);

async function kanalLaden({ handle, kanalId, bereich, max, schluessel }) {
  const werte = { part: "snippet,statistics,contentDetails" };
  if (kanalId) werte.id = kanalId; else werte.forHandle = handle;
  const ch = (await api("channels", werte, schluessel)).items?.[0];
  if (!ch) throw new Error("Diesen Kanal findet die YouTube-API nicht.");
  const id = ch.id;
  await kanalVerlaufSchreiben(ch).catch(() => { });

  // Getrennte Listen für lange Videos (UULF…) und Shorts (UUSH…). Beide sind nicht offiziell dokumentiert;
  // fehlen sie, nimmt Social-Radar die gesamte Upload-Liste und kennzeichnet das als „gemischt“.
  const liste = (bereich === "shorts" ? "UUSH" : "UULF") + id.slice(2);
  let ids, gemischt = false;
  try { ids = await listeLaden(liste, max, schluessel); }
  catch (f) {
    if (f.status !== 404) throw f;
    ids = await listeLaden(ch.contentDetails.relatedPlaylists.uploads, max, schluessel);
    gemischt = true;
  }

  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await api("videos", { part: "snippet,statistics,contentDetails", id: ids.slice(i, i + 50).join(","), maxResults: 50 }, schluessel);
    (j.items || []).forEach(v => videos.push({
      id: v.id,
      titel: v.snippet.title,
      url: bereich === "shorts" ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`,
      bild: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || "",
      datum: v.snippet.publishedAt,
      views: +(v.statistics.viewCount || 0),
      likes: v.statistics.likeCount != null ? +v.statistics.likeCount : null,
      kommentare: v.statistics.commentCount != null ? +v.statistics.commentCount : null,
      dauerSek: RadarKern.dauerSek(v.contentDetails.duration)
    }));
  }

  return {
    kanal: {
      id, name: ch.snippet.title, handle: ch.snippet.customUrl || handle || "",
      follower: ch.statistics.hiddenSubscriberCount ? 0 : +(ch.statistics.subscriberCount || 0),
      followerVersteckt: !!ch.statistics.hiddenSubscriberCount,
      videosGesamt: +(ch.statistics.videoCount || 0),
      viewsGesamt: +(ch.statistics.viewCount || 0)
    },
    videos, bereich, gemischt, max, geladenAm: Date.now()
  };
}

async function listeLaden(playlistId, max, schluessel) {
  const ids = [];
  let seite = "";
  while (ids.length < max) {
    const werte = { part: "contentDetails", playlistId, maxResults: 50 };
    if (seite) werte.pageToken = seite;
    const j = await api("playlistItems", werte, schluessel);
    (j.items || []).forEach(i => ids.push(i.contentDetails.videoId));
    seite = j.nextPageToken;
    if (!seite) break;
  }
  return ids.slice(0, max);
}
