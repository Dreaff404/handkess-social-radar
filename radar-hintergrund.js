// Social-Radar – Hintergrund: holt Kanaldaten über die offizielle YouTube Data API v3.
// Einzige Netzwerkverbindung der Erweiterung: https://www.googleapis.com/youtube/v3/ mit Andrés eigenem API-Schlüssel.
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
  return daten;
}

async function kanalLaden({ handle, kanalId, bereich, max, schluessel }) {
  const werte = { part: "snippet,statistics,contentDetails" };
  if (kanalId) werte.id = kanalId; else werte.forHandle = handle;
  const ch = (await api("channels", werte, schluessel)).items?.[0];
  if (!ch) throw new Error("Diesen Kanal findet die YouTube-API nicht.");
  const id = ch.id;

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
      videosGesamt: +(ch.statistics.videoCount || 0)
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
