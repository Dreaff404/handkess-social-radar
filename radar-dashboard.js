// HandKess Social Radar – Vergleichs-Dashboard (M5): die selbst gespeicherten Profile aller Plattformen, in eigenen Ordnern (André, 2026-11-04).
// Gespeichert wird im Panel („☆ Speichern“); hier: Ordner anlegen, umbenennen, löschen, Profile verschieben oder herausnehmen.
// Liest nur den lokalen Speicher der Erweiterung (gespeichert, YouTube: cache:*, Instagram ig:*, TikTok tt:*, Facebook fb:*, dazu marker und tags).
// Keine Netzwerkverbindung. Grundfunktionen nach Andrés Dashboard-Standard: Hell/Dunkel, Paper, verstellbare Kacheln, gemerkte Einstellungen.
const K = RadarKern;
const PLATTFORMEN = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };
const BEREICH = { videos: "Videos", shorts: "Shorts", beitraege: "Beiträge", reels: "Reels" };
const ZEITRAUM = [[30, "30 Tage"], [60, "60 Tage"], [90, "90 Tage"], [365, "1 Jahr"], [0, "Alle"]];
const KACHELN = [
  { id: "ueberblick", titel: "Überblick" },
  { id: "vergleich", titel: "Wettbewerber im Vergleich" },
  { id: "entwicklung", titel: "Entwicklung über die Zeit" },
  { id: "top", titel: "Stärkste Beiträge im Vergleich zum eigenen Profil" }
];
const LAYOUT_STANDARD = KACHELN.map(k => ({ id: k.id, breite: "voll", weg: false }));
const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
const merke = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const lies = k => { try { return localStorage.getItem(k); } catch { return null; } };

let auswahl = (() => { try { return JSON.parse(lies("hsr_entwicklung") || "null"); } catch { return null; } })();   // Profile im Entwicklungs-Graphen
let kennzahlGraph = lies("hsr_graph") || "ter";
let zustand = { ordner: lies("hsr_ordner") || "alle", plattform: lies("hsr_plattform") || "alle", zeitraum: +(lies("hsr_zeitraum") ?? 90), sort: lies("hsr_sort") || "ter", absteigend: lies("hsr_ab") !== "0" };
let profile = [], gespeichert = { ordner: [], profile: {}, zuletzt: null }, einst = { gruen: 5, rot: 1 }, layout = structuredClone(LAYOUT_STANDARD), layoutVorher = null;

// ---------- Daten aus dem Speicher ----------
function urlFuer(p) {
  const h = p.kanal.handle || "";
  if (p.plattform === "youtube") return (h ? "https://www.youtube.com/" + h.replace(/^(?!@)/, "@") : "https://www.youtube.com/channel/" + p.kanal.id) + "/" + (p.bereich === "shorts" ? "shorts" : "videos");
  if (p.plattform === "instagram") return `https://www.instagram.com/${h}/${p.bereich === "reels" ? "reels/" : ""}`;
  if (p.plattform === "tiktok") return `https://www.tiktok.com/@${h}`;
  return `https://www.facebook.com/${h}/${p.bereich === "reels" ? "reels/" : ""}`;
}

async function laden() {
  const alles = await chrome.storage.local.get(null);
  einst = { gruen: 5, rot: 1, ...alles.einstellungen };
  const tags = alles.tags || {}, marker = alles.marker || {}, verlauf = alles.verlauf || {};
  const roh = new Map();   // Schlüssel Plattform:Kanal:Bereich → Eintrag (jüngster gewinnt, YouTube kann unter Handle und Kennung liegen)
  const nimm = (e) => { const k = `${e.plattform}:${e.kanal.id}:${e.bereich}`; if (!roh.has(k) || roh.get(k).stand < e.stand) roh.set(k, e); };
  for (const [k, d] of Object.entries(alles)) {
    if (k.startsWith("cache:") && d?.kanal && Array.isArray(d.videos))
      nimm({ plattform: "youtube", kanal: d.kanal, bereich: d.bereich, videos: d.videos, stand: d.geladenAm });
    const m = /^(ig|tt|fb):/.exec(k);
    if (m && d?.listen && d?.medien) {
      const plattform = { ig: "instagram", tt: "tiktok", fb: "facebook" }[m[1]];
      for (const [bereich, ids] of Object.entries(d.listen)) {
        const videos = ids.map(id => d.medien[id]).filter(v => v?.datum);
        if (videos.length) nimm({ plattform, kanal: d.kanal, bereich, videos, stand: d.aktualisiert });
      }
    }
  }
  // Nur gespeicherte Profile – je Bereich mit Daten eine Zeile, ohne Daten eine Platzhalter-Zeile
  gespeichert = { ordner: [], profile: {}, zuletzt: null, ...alles.gespeichert };
  if (zustand.ordner !== "alle" && zustand.ordner !== "ohne" && !gespeichert.ordner.some(o => o.id === zustand.ordner)) zustand.ordner = "alle";
  const daten = [...roh.values()];
  profile = Object.entries(gespeichert.profile).flatMap(([schluessel, g]) => {
    const zeilen = daten.filter(d => d.plattform === g.plattform && d.kanal.id === g.kanalId);
    const basis = { schluessel, ordner: g.ordner || null, tags, mein: !!g.mein, verlauf: verlauf[schluessel] || [], markerAlle: [] };
    if (!zeilen.length) {
      const p = { plattform: g.plattform, kanal: { id: g.kanalId, name: g.name, handle: g.handle, follower: 0 }, bereich: g.plattform === "youtube" ? "videos" : g.plattform === "tiktok" ? "videos" : "beitraege", videos: [], stand: null };
      return [{ ...p, ...basis, alle: [], letzterMarker: null, platzhalter: true, url: urlFuer(p) }];
    }
    return zeilen.map(p => {
      const liste = (marker[`${p.kanal.id}:${p.bereich}`] || []);
      return { ...p, ...basis, markerAlle: liste, alle: p.videos.map(v => K.kennzahlen(v, p.kanal.follower)), letzterMarker: liste[liste.length - 1] || null, url: urlFuer(p) };
    });
  });
  zeichnen();
}

// Kennzahlen eines Profils im gewählten Zeitraum
function werte(p) {
  const im = K.filtern(p.alle, { zeitraum: zustand.zeitraum });
  const sum = K.kanalSchnitt(im, p.kanal.follower);
  const formate = K.jeTag(im, p.tags).filter(f => f.ter != null).slice(0, 3);
  const plus = p.letzterMarker && p.kanal.follower ? p.kanal.follower - p.letzterMarker.follower : null;
  return { im, sum, formate, plus, trend: K.trend(p.alle, "ter").aenderung };
}

// ---------- Zeichnen ----------
const ordnerName = id => gespeichert.ordner.find(o => o.id === id)?.name || "Ohne Ordner";
function zeichnen() {
  const imOrdner = (o) => profile.filter(p => o === "ohne" ? !p.ordner : p.ordner === o).map(p => p.schluessel);
  const anzahl = o => new Set(imOrdner(o)).size;
  $("filter-ordner").innerHTML = `<span class="lab">Ordner</span>` +
    [["alle", `Alle (${Object.keys(gespeichert.profile).length})`], ...gespeichert.ordner.map(o => [o.id, `${esc(o.name)} (${anzahl(o.id)})`]), ...(anzahl("ohne") ? [["ohne", `Ohne Ordner (${anzahl("ohne")})`]] : [])]
      .map(([id, n]) => `<button class="chip ${zustand.ordner === id ? "an" : ""}" data-ordner-filter="${esc(id)}">${n}</button>`).join("") +
    `<button data-ordner-neu>+ Neuer Ordner</button>` +
    (zustand.ordner !== "alle" && zustand.ordner !== "ohne" ? `<button data-ordner-umbenennen>Umbenennen</button><button data-ordner-loeschen>Ordner löschen</button>` : "");
  $("filter-plattform").innerHTML = `<span class="lab">Plattform</span>` + [["alle", "Alle"], ...Object.entries(PLATTFORMEN)]
    .map(([id, n]) => `<button class="chip ${zustand.plattform === id ? "an" : ""}" data-plattform="${id}">${n}</button>`).join("");
  $("filter-zeitraum").innerHTML = `<span class="lab">Zeitraum</span>` + ZEITRAUM
    .map(([t, n]) => `<button class="chip ${zustand.zeitraum === t ? "an" : ""}" data-zeitraum="${t}">${n}</button>`).join("");
  // Kanal-Score: über alle gespeicherten Profile, verglichen innerhalb Plattform + Bereich (unabhängig vom Ordner-Filter)
  const alleWerte = profile.filter(p => !p.platzhalter).map(p => ({ p, w: werte(p) }));
  scores = K.kanalScores(alleWerte.map(({ p, w }) => ({ id: p.schluessel + ":" + p.bereich, gruppe: p.plattform + ":" + p.bereich,
    werte: { ter: w.sum.ter, reach: w.sum.reach, trend: w.trend, wachstum: K.wachstumProWoche([...p.verlauf, ...p.markerAlle]) } })));
  const sichtbar = profile.filter(p => (zustand.plattform === "alle" || p.plattform === zustand.plattform)
    && (zustand.ordner === "alle" || (zustand.ordner === "ohne" ? !p.ordner : p.ordner === zustand.ordner))).map(p => ({ ...p, w: werte(p) }));
  // Portfolio & Co. leben seit v2.0 im eigenen Analyse-Studio (radar-analyse.html)
  $("tabs").innerHTML = `<button class="tab an" aria-pressed="true">Vergleich</button><a class="tab" href="radar-analyse.html" data-studio>Analyse-Studio ↗</a>`;
  const inhalt = { ueberblick: ueberblick(sichtbar), vergleich: vergleich(sichtbar), entwicklung: entwicklung(sichtbar), top: topBeitraege(sichtbar) };
  $("kacheln").innerHTML = layout.map((l, i) => {
    const k = KACHELN.find(x => x.id === l.id);
    return `<section class="kachel ${l.breite === "halb" ? "halb" : ""} ${l.weg ? "weg" : ""}" data-kachel="${l.id}">
      <div class="kachel-kopf"><h2>${k.titel}</h2>
        <span class="werkzeug">
          <button data-schieben="-1" data-i="${i}" title="Nach oben" ${i === 0 ? "disabled" : ""}>↑</button>
          <button data-schieben="1" data-i="${i}" title="Nach unten" ${i === layout.length - 1 ? "disabled" : ""}>↓</button>
          <button data-breite="${i}">${l.breite === "halb" ? "Volle Breite" : "Halbe Breite"}</button>
          <button data-weg="${i}">${l.weg ? "Einblenden" : "Ausblenden"}</button>
        </span></div>
      ${inhalt[l.id]}</section>`;
  }).join("");
}

function ueberblick(ps) {
  if (!ps.length) return leer();
  ps = ps.filter(p => !p.platzhalter);
  if (!ps.length) return `<div class="leer">Für diese Profile sind noch keine Zahlen gesammelt – einmal mit dem Radar öffnen.</div>`;
  const mitEr = ps.filter(p => p.w.sum.ter != null);
  const bester = mitEr.sort((a, b) => b.w.sum.ter - a.w.sum.ter)[0];
  const zuwachs = ps.filter(p => p.w.plus != null).sort((a, b) => b.w.plus - a.w.plus)[0];
  const beitraege = ps.reduce((s, p) => s + p.w.im.length, 0);
  const zahl = (l, w, z = "") => `<div class="zahl"><div class="l">${l}</div><div class="w">${w}</div>${z ? `<div class="z">${z}</div>` : ""}</div>`;
  const woche = K.isoWoche();
  const faellig = [...new Map(ps.filter(p => !p.verlauf.some(v => v.woche === woche)).map(p => [p.schluessel, p])).values()];
  return `<div class="zahlen">
    ${(() => { const st = [...new Map(ps.map(p => [p.schluessel + ":" + p.bereich, scoreVon(p).stufe])).values()]; const n = k => st.filter(x => x === k).length;
      return zahl("Score im Vergleich", `<span class="score gut"><i></i>${n("gut")}</span> <span class="score mittel"><i></i>${n("mittel")}</span> <span class="score schwach"><i></i>${n("schwach")}</span>`, `gut · mittel · schwach${n("offen") ? ` · ${n("offen")} ohne Vergleich` : ""}`); })()}
    ${zahl("Diese Woche fällig", K.zahl(faellig.length), faellig.length ? "Profile ohne Wochenstand – einmal öffnen" : "alle Profile haben einen Wochenstand")}
    ${zahl("Profile in der Übersicht", K.zahl(new Set(ps.map(p => p.schluessel)).size), [...new Set(ps.map(p => PLATTFORMEN[p.plattform]))].join(" · "))}
    ${zahl("Beiträge im Zeitraum", K.zahl(beitraege))}
    ${zahl("Beste theoretische ER", bester ? K.prozent(bester.w.sum.ter) : "–", bester ? esc(bester.kanal.name) + " · " + PLATTFORMEN[bester.plattform] : "")}
    ${zahl("Stärkster Follower-Zuwachs", zuwachs ? (zuwachs.w.plus > 0 ? "+" : "") + K.zahl(zuwachs.w.plus) : "–", zuwachs ? esc(zuwachs.kanal.name) + " · seit Marker" : "noch keine Marker gesetzt")}
  </div>
  ${faellig.length ? `<div class="faellig"><span class="lab">Fällig</span>${faellig.slice(0, 12).map(p => `<a class="tag" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.kanal.name || p.kanal.handle)}</a>`).join("")}</div>` : ""}`;
}

const SPALTEN = [
  ["name", "Profil"], ["score", "Score", true], ["follower", "Follower", true], ["ter", "Theoretische ER", true], ["views", "Ø Views", true],
  ["anzahl", "Beiträge", true], ["plus", "Zuwachs seit Marker", true], ["trend", "Trend ER (30 T)", true], ["formate", "Top-Formate (ER)"], ["ordner", "Ordner"]
];
function sortwert(p, s) {
  return { score: scoreVon(p).score, name: p.kanal.name?.toLowerCase(), plattform: p.plattform, follower: p.kanal.follower, ter: p.w.sum.ter, views: p.w.sum.views, anzahl: p.w.im.length, plus: p.w.plus, trend: p.w.trend, formate: p.w.formate[0]?.ter, stand: p.stand, ordner: ordnerName(p.ordner).toLowerCase() }[s];
}
function vergleich(ps) {
  if (!ps.length) return leer();
  const sortiert = [...ps].sort((a, b) => {
    const x = sortwert(a, zustand.sort), y = sortwert(b, zustand.sort);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (x < y ? -1 : x > y ? 1 : 0) * (zustand.absteigend ? -1 : 1);
  });
  const er = t => { const a = K.ampel(t, einst); return `<span class="${a === "gut" ? "gut" : a === "schwach" ? "schwach" : ""}">${K.prozent(t)}</span>`; };
  const ordnerWahl = p => `<select data-verschieben="${esc(p.schluessel)}" aria-label="Ordner">
      <option value="" ${!p.ordner ? "selected" : ""}>Ohne Ordner</option>
      ${gespeichert.ordner.map(o => `<option value="${esc(o.id)}" ${p.ordner === o.id ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
      <button class="klein" data-entfernen="${esc(p.schluessel)}" title="Aus der Übersicht nehmen (gesammelte Zahlen bleiben)">Entfernen</button>`;
  // „Mein Kanal“ je Plattform: Vergleichswert für jede Wettbewerberzeile derselben Plattform (gleicher Bereich, sonst irgendeiner)
  const mein = profile.filter(p => p.mein && !p.platzhalter).map(p => ({ ...p, w: werte(p) }));
  const meinFuer = p => mein.find(m => m.plattform === p.plattform && m.bereich === p.bereich) || mein.find(m => m.plattform === p.plattform);
  const vergleichMit = p => {
    const m = !p.mein && meinFuer(p);
    if (!m) return { er: "", views: "" };
    const d = p.w.sum.ter != null && m.w.sum.ter != null ? p.w.sum.ter - m.w.sum.ter : null;
    const f = p.w.sum.views && m.w.sum.views ? p.w.sum.views / m.w.sum.views : null;
    return {
      er: d == null ? "" : `<div class="diff">${d > 0 ? "+" : ""}${(Math.round(d * 100) / 100).toLocaleString("de-DE")} Pkt. ggü. dir</div>`,
      views: f == null ? "" : `<div class="diff">${K.faktor(f)} deine</div>`
    };
  };
  const trendZelle = a => a == null ? `<span class="leise">–</span>` : `<span class="${a > 5 ? "plus" : a < -5 ? "minus" : ""}">${a > 0 ? "+" : ""}${Math.round(a).toLocaleString("de-DE")} %</span>`;
  const zeile = p => p.platzhalter
    ? `<tr data-zeile="${esc(p.schluessel)}"><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.kanal.name || p.kanal.handle)}</a><div><span class="plattform">${PLATTFORMEN[p.plattform]}</span></div></td>
        <td></td><td colspan="7" class="leise">noch keine Zahlen – Profil einmal mit dem Radar öffnen</td><td class="aktion">${ordnerWahl(p)}</td></tr>`
    : `<tr data-zeile="${esc(p.schluessel + ":" + p.bereich)}" class="${p.mein ? "mein" : ""}">
      <td><a href="${esc(p.url)}" target="_blank" rel="noopener" title="Stand ${p.stand ? new Date(p.stand).toLocaleDateString("de-DE") : "–"}">${esc(p.kanal.name || p.kanal.handle)}</a> ${p.mein ? ` <span class="mein-marke">Mein Kanal</span>` : ""}<div><span class="plattform">${PLATTFORMEN[p.plattform]}</span> <span class="leise">${BEREICH[p.bereich] || p.bereich}</span></div></td>
      <td class="zahl-r">${scoreZelle(p)}</td>
      <td class="zahl-r">${p.kanal.follower ? K.zahl(p.kanal.follower) : "–"}</td>
      <td class="zahl-r">${er(p.w.sum.ter)}${vergleichMit(p).er}</td>
      <td class="zahl-r">${K.kurz(p.w.sum.views)}${vergleichMit(p).views}</td>
      <td class="zahl-r">${K.zahl(p.w.im.length)}</td>
      <td class="zahl-r umbruch">${p.w.plus == null ? `<span class="leise">kein Marker</span>` : `<span class="${p.w.plus > 0 ? "plus" : p.w.plus < 0 ? "minus" : ""}">${p.w.plus > 0 ? "+" : ""}${K.zahl(p.w.plus)}</span> <span class="leise">seit ${new Date(p.letzterMarker.zeit).toLocaleDateString("de-DE")}</span>`}</td>
      <td class="zahl-r">${trendZelle(p.w.trend)}</td>
      <td class="umbruch">${p.w.formate.length ? p.w.formate.map(f => `<span class="tag">${esc(f.tag)} ${K.prozent(f.ter)}</span>`).join("") : `<span class="leise">keine Hashtags</span>`}</td>
      <td class="aktion">${ordnerWahl(p)}</td></tr>`;
  // Bei „Alle“ nach Ordnern gruppiert (Reihenfolge der Ordner), sonst eine Liste
  // „Mein Kanal“ steht immer oben (eigene Gruppe bei „Alle“), danach die Ordner
  const gruppen = zustand.ordner === "alle"
    ? [["Mein Kanal", sortiert.filter(p => p.mein)], ...[...gespeichert.ordner.map(o => [o.id, o.name]), [null, "Ohne Ordner"]].map(([id, name]) => [name, sortiert.filter(p => !p.mein && (p.ordner || null) === id)])].filter(([, l]) => l.length)
    : [[null, [...sortiert.filter(p => p.mein), ...sortiert.filter(p => !p.mein)]]];
  return `<div class="tabelle"><table><thead><tr>${SPALTEN.map(([id, n, r]) => `<th data-sort="${id}" class="${r ? "zahl-r" : ""} ${zustand.sort === id ? "sortiert" : ""}">${n}${zustand.sort === id ? (zustand.absteigend ? " ↓" : " ↑") : ""}</th>`).join("")}</tr></thead>
    ${gruppen.map(([name, l]) => `<tbody>${name ? `<tr class="gruppe"><td colspan="${SPALTEN.length}">${esc(name)} <span class="leise">· ${new Set(l.map(p => p.schluessel)).size}</span></td></tr>` : ""}${l.map(zeile).join("")}</tbody>`).join("")}
  </table></div>`;
}

// ---------- Entwicklung über die Zeit ----------
// Zwei Graphen: Follower aus den Wochenständen (+ Markern) und 30-Tage-Schnitt der Beiträge nach Veröffentlichungsdatum.
// Bis zu 4 Profile; „Mein Kanal“ ist immer Farbe 1. Mehrere Profile mit unterschiedlicher Größe → Index (erster Punkt = 100), eine Achse.
const FARBEN = 4;
let graphen = {};
let scores = {};
const STUFE = { gut: "Gut", mittel: "Mittel", schwach: "Schwach", offen: "Zu wenig Vergleich" };
const scoreVon = p => scores[p.schluessel + ":" + p.bereich] || { score: null, stufe: "offen", teile: {}, vergleich: 0 };
function scoreZelle(p) {
  const s = scoreVon(p);
  const teile = Object.entries(s.teile).map(([f, a]) => `${K.SCORE_FELDER[f]}: besser als ${Math.round(a * 100)} %`).join(" · ");
  const titel = s.score == null
    ? `Mindestens 3 gespeicherte Profile von ${PLATTFORMEN[p.plattform]} (${BEREICH[p.bereich] || p.bereich}) nötig – bisher ${s.vergleich + 1}`
    : `Verglichen mit ${s.vergleich} gespeicherten Profilen derselben Plattform. ${teile}`;
  return `<span class="score ${s.stufe}" title="${esc(titel)}"><i></i>${s.score == null ? "–" : s.score} <span>${STUFE[s.stufe]}</span></span>`;
}   // id → { serien, format } für Tooltip und Tabelle
function profilKarte(ps) {   // je gespeichertem Profil alle Beiträge (über Bereiche) und sein Verlauf
  const m = new Map();
  ps.filter(p => !p.platzhalter).forEach(p => {
    const x = m.get(p.schluessel) || { schluessel: p.schluessel, name: p.kanal.name || p.kanal.handle, plattform: p.plattform, mein: p.mein, alle: [], verlauf: p.verlauf, marker: [] };
    x.alle.push(...p.alle); x.marker.push(...p.markerAlle.map(mk => ({ zeit: mk.zeit, follower: mk.follower })));
    m.set(p.schluessel, x);
  });
  return [...m.values()];
}
function entwicklung(ps) {
  const karte = profilKarte(ps);
  if (!karte.length) return leer();
  // Auswahl: gemerkt, sonst „Mein Kanal“ + erster Wettbewerber; nur, was im aktuellen Filter sichtbar ist
  let gewaehlt = (auswahl || []).filter(s => karte.some(k => k.schluessel === s));
  if (!gewaehlt.length) gewaehlt = [...karte.filter(k => k.mein), ...karte.filter(k => !k.mein)].slice(0, 2).map(k => k.schluessel);
  const sortiertWahl = [...gewaehlt].sort((a, b) => (karte.find(k => k.schluessel === b).mein ? 1 : 0) - (karte.find(k => k.schluessel === a).mein ? 1 : 0));
  const reihen = sortiertWahl.slice(0, FARBEN).map((s, i) => ({ ...karte.find(k => k.schluessel === s), farbe: i + 1 }));
  const chips = karte.map(k => `<button class="chip ${gewaehlt.includes(k.schluessel) ? "an" : ""}" data-graph-profil="${esc(k.schluessel)}">${esc(k.name)}${k.mein ? " · Mein Kanal" : ""}</button>`).join("");
  const index = reihen.length > 1;
  // Follower: Wochenstände und Marker, nach Zeit
  const jeTag = punkte => [...new Map(punkte.filter(x => x.y).map(x => [new Date(x.t).toDateString(), x])).values()].sort((a, b) => a.t - b.t);
  const follower = reihen.map(r => ({ name: r.name, farbe: r.farbe, punkte: jeTag([...r.marker.map(mk => ({ t: mk.zeit, y: mk.follower })), ...r.verlauf.map(v => ({ t: v.zeit, y: v.follower }))]) }));
  const beitraege = reihen.map(r => ({ name: r.name, farbe: r.farbe, punkte: K.rollend(r.alle, kennzahlGraph) }));
  const trends = reihen.map(r => ({ name: r.name, farbe: r.farbe, a: K.trend(r.alle, kennzahlGraph).aenderung }));
  return `<div class="reihe"><span class="lab">Profile</span>${chips}</div>
    <div class="leise zeile">Bis zu ${FARBEN} Profile; „Mein Kanal“ ist immer dabei, wenn markiert und ausgewählt.</div>
    <div class="graphen">
      <div class="graph-feld"><h3>Follower ${index ? "– Wachstum seit erstem Stand (Index 100)" : "(Wochenstände)"}</h3>
        ${linien("follower", follower, { index, format: index ? indexText : K.zahl, leer: "Noch zu wenig Wochenstände – der Verlauf wächst mit jeder Woche, in der du das Profil öffnest (oder mit Markern)." })}</div>
      <div class="graph-feld"><h3>Beiträge – 30-Tage-Schnitt ${kennzahlGraph === "ter" ? "der theoretischen ER" : "der Views"}${index && kennzahlGraph === "views" ? " (Index 100)" : ""}</h3>
        <div class="reihe klein"><button class="chip ${kennzahlGraph === "ter" ? "an" : ""}" data-graph-kennzahl="ter">Theoretische ER</button><button class="chip ${kennzahlGraph === "views" ? "an" : ""}" data-graph-kennzahl="views">Views</button></div>
        ${linien("beitraege", beitraege, { index: index && kennzahlGraph === "views", format: kennzahlGraph === "ter" ? K.prozent : (index ? indexText : K.kurz), leer: "Zu wenige Beiträge mit Datum für einen Verlauf." })}
        <div class="trends">${trends.map(x => `<span><i class="punkt s${x.farbe}"></i>${esc(x.name)}: ${x.a == null ? "–" : `<b class="${x.a > 5 ? "plus" : x.a < -5 ? "minus" : ""}">${x.a > 0 ? "+" : ""}${Math.round(x.a)} %</b>`} <span class="leise">letzte 30 T ggü. davor</span></span>`).join("")}</div></div>
    </div>`;
}
const indexText = n => n == null ? "–" : Math.round(n).toLocaleString("de-DE");

// Liniengraph als SVG (ohne Bibliothek): eine Achse, dünne Linien, Endbeschriftung, Fadenkreuz-Tooltip, Tabelle zum Aufklappen
function linien(id, serien, { index = false, format, leer: leerText }) {
  serien = serien.map(s => {
    let p = s.punkte.filter(x => x.y != null);
    if (index && p.length) { const b = p[0].y; p = p.map(x => ({ ...x, roh: x.y, y: b ? x.y / b * 100 : null })).filter(x => x.y != null); }
    return { ...s, punkte: p };
  }).filter(s => s.punkte.length);
  if (!serien.length || serien.every(s => s.punkte.length < 2)) return `<div class="leer klein">${leerText}</div>`;
  graphen[id] = { serien, format };
  const B = 720, H = 240, L = 56, R = 120, O = 12, U = 28;
  const ts = serien.flatMap(s => s.punkte.map(x => x.t)), ys = serien.flatMap(s => s.punkte.map(x => x.y));
  const t0 = Math.min(...ts), t1 = Math.max(...ts) || t0 + 1;
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= Math.abs(y0) * 0.1 || 1; y1 += Math.abs(y1) * 0.1 || 1; }
  const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
  if (Math.min(...ys) >= 0) y0 = Math.max(0, y0);
  const x = t => L + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (B - L - R), y = v => O + (1 - (v - y0) / (y1 - y0)) * (H - O - U);
  const ticks = [0, 1, 2, 3].map(i => y0 + (y1 - y0) * i / 3);
  const datum = t => new Date(t).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  // Liegen mehr als 3 Wochen zwischen zwei Punkten, bricht die Linie ab – sonst würde eine Lücke als Verlauf erscheinen
  const LUECKE = 21 * 86400000;
  const pfad = s => s.punkte.map((p, i) => `${i && p.t - s.punkte[i - 1].t <= LUECKE ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
  // Endbeschriftung: rechts neben dem letzten Punkt, gegen Überlappung leicht auseinandergeschoben
  const enden = serien.map(s => ({ s, yy: y(s.punkte[s.punkte.length - 1].y) })).sort((a, b) => a.yy - b.yy);
  enden.forEach((e, i) => { if (i && e.yy - enden[i - 1].yy < 14) e.yy = enden[i - 1].yy + 14; });
  return `<div class="graph" data-graph="${id}">
    <svg viewBox="0 0 ${B} ${H}" role="img" aria-label="${esc(serien.map(s => s.name).join(", "))}">
      ${ticks.map(v => `<line class="gitter" x1="${L}" x2="${B - R}" y1="${y(v)}" y2="${y(v)}"/><text class="achse" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${esc(format(v))}</text>`).join("")}
      ${index ? `<line class="basis" x1="${L}" x2="${B - R}" y1="${y(100)}" y2="${y(100)}"/>` : ""}
      <text class="achse" x="${L}" y="${H - 8}">${datum(t0)}</text><text class="achse" x="${B - R}" y="${H - 8}" text-anchor="end">${datum(t1)}</text>
      ${serien.map(s => `${s.punkte.length > 1 ? `<path class="linie s${s.farbe}" d="${pfad(s)}"/>` : ""}${s.punkte.length < 12 || s.punkte.some((p, i) => i && p.t - s.punkte[i - 1].t > LUECKE) ? s.punkte.map(p => `<circle class="punkt-k s${s.farbe}" cx="${x(p.t)}" cy="${y(p.y)}" r="4"/>`).join("") : ""}`).join("")}
      ${enden.map(e => `<text class="ende" x="${B - R + 8}" y="${e.yy + 4}">${esc(e.s.name.slice(0, 16))}</text>`).join("")}
      <line class="kreuz" x1="0" x2="0" y1="${O}" y2="${H - U}" visibility="hidden"/>
      <rect class="fang" x="${L}" y="0" width="${B - L - R}" height="${H}" fill="transparent" data-x0="${t0}" data-x1="${t1}" data-l="${L}" data-b="${B - L - R}"/>
    </svg>
    <div class="tipp" hidden></div>
    <div class="legende">${serien.map(s => `<span><i class="punkt s${s.farbe}"></i>${esc(s.name)}</span>`).join("")}</div>
    <details><summary>Als Tabelle</summary><table class="klein-tab"><thead><tr><th>Datum</th>${serien.map(s => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>
      ${[...new Set(serien.flatMap(s => s.punkte.map(p => p.t)))].sort((a, b) => a - b).map(t => `<tr><td>${datum(t)}</td>${serien.map(s => { const p = s.punkte.find(q => q.t === t); return `<td>${p ? esc(format(p.y)) : ""}</td>`; }).join("")}</tr>`).join("")}
    </tbody></table></details></div>`;
}

// Fadenkreuz: nächster Zeitpunkt je Linie, Werte im Tooltip (Text über textContent)
document.addEventListener("pointermove", e => {
  const fang = e.target.closest?.(".fang");
  document.querySelectorAll(".graph").forEach(g => { if (!fang || !g.contains(fang)) { g.querySelector(".kreuz")?.setAttribute("visibility", "hidden"); const tp = g.querySelector(".tipp"); if (tp) tp.hidden = true; } });
  if (!fang) return;
  const g = fang.closest(".graph"), daten = graphen[g.dataset.graph]; if (!daten) return;
  const svg = fang.ownerSVGElement, r = svg.getBoundingClientRect(), skala = r.width / svg.viewBox.baseVal.width;
  const px = (e.clientX - r.left) / skala, l = +fang.dataset.l, b = +fang.dataset.b, t0 = +fang.dataset.x0, t1 = +fang.dataset.x1;
  const t = t0 + Math.min(1, Math.max(0, (px - l) / b)) * (t1 - t0);
  const kreuz = g.querySelector(".kreuz"); kreuz.setAttribute("x1", px); kreuz.setAttribute("x2", px); kreuz.setAttribute("visibility", "visible");
  const tipp = g.querySelector(".tipp"); tipp.textContent = ""; tipp.hidden = false;
  const kopf = document.createElement("div"); kopf.className = "leise"; kopf.textContent = new Date(t).toLocaleDateString("de-DE"); tipp.appendChild(kopf);
  daten.serien.forEach(s => {
    const p = s.punkte.reduce((a, q) => Math.abs(q.t - t) < Math.abs(a.t - t) ? q : a);
    const z = document.createElement("div"); const i = document.createElement("i"); i.className = "punkt s" + s.farbe; z.appendChild(i);
    const w = document.createElement("b"); w.textContent = daten.format(p.y) + " "; z.appendChild(w); z.appendChild(document.createTextNode(s.name)); tipp.appendChild(z);
  });
  tipp.style.left = Math.min(r.width - 190, Math.max(0, e.clientX - r.left + 12)) + "px";
});

// Beiträge, die im eigenen Profil am meisten herausstechen (theoretische ER ÷ Schnitt des Profils) – fair über Profilgrößen hinweg
function topBeitraege(ps) {
  ps = ps.filter(p => !p.platzhalter);
  if (!ps.length) return leer();
  const alle = ps.flatMap(p => p.w.im.filter(v => v.ter != null && p.w.sum.ter).map(v => ({ v, p, faktor: v.ter / p.w.sum.ter })));
  const beste = alle.sort((a, b) => b.faktor - a.faktor).slice(0, 8);
  if (!beste.length) return `<div class="leer">Im Zeitraum gibt es keine Beiträge mit theoretischer ER.</div>`;
  return `<div class="liste">${beste.map(({ v, p, faktor }) => `<div class="beitrag">
      ${v.bild ? `<img src="${esc(v.bild)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<img alt="">`}
      <div class="info"><a class="t" href="${esc(v.url)}" target="_blank" rel="noopener" title="${esc(v.titel)}">${esc(v.titel)}</a>
        <div><b>${K.faktor(faktor)}</b> <span class="leise">Profil-Schnitt · ER ${K.prozent(v.ter)}</span></div>
        <div class="leise">${esc(p.kanal.name)} · ${PLATTFORMEN[p.plattform]} · vor ${K.zahl(v.tage)} T</div></div></div>`).join("")}</div>`;
}

const leer = () => !Object.keys(gespeichert.profile).length
  ? `<div class="leer">Noch keine gespeicherten Profile. Öffne einen Kanal oder ein Profil und klick im Radar auf „☆ Speichern“ – dann erscheint es hier, auf Wunsch in einem Ordner.</div>`
  : `<div class="leer">Hier liegt noch nichts${zustand.plattform !== "alle" ? " von " + PLATTFORMEN[zustand.plattform] : ""}. Profile verschiebst du über die Spalte „Ordner“ oder im Radar-Panel.</div>`;

// ---------- Gespeichertes ändern ----------
function aendern(f) {
  gespeichert = structuredClone(gespeichert);
  f(gespeichert);
  chrome.storage.local.set({ gespeichert });
  laden();
}
function neuerOrdner() {
  const name = (prompt("Name des neuen Ordners:") || "").trim();
  if (!name) return null;
  const id = "o" + Date.now().toString(36);
  aendern(g => g.ordner.push({ id, name }));
  return id;
}

// ---------- Bedienung ----------
document.addEventListener("click", e => {
  const b = e.target.closest("button, th");
  if (!b) return;
  if (b.dataset.graphProfil) {
    const s = b.dataset.graphProfil, akt = new Set(auswahl || [...document.querySelectorAll("[data-graph-profil].an")].map(x => x.dataset.graphProfil));
    if (akt.has(s)) akt.delete(s); else if (akt.size < FARBEN) akt.add(s);
    auswahl = [...akt]; merke("hsr_entwicklung", JSON.stringify(auswahl));
  }
  else if (b.dataset.graphKennzahl) { kennzahlGraph = b.dataset.graphKennzahl; merke("hsr_graph", kennzahlGraph); }
  else if (b.dataset.ordnerFilter) { zustand.ordner = b.dataset.ordnerFilter; merke("hsr_ordner", zustand.ordner); }
  else if (b.hasAttribute("data-ordner-neu")) { const id = neuerOrdner(); if (id) { zustand.ordner = id; merke("hsr_ordner", id); } return; }
  else if (b.hasAttribute("data-ordner-umbenennen")) {
    const alt = ordnerName(zustand.ordner), name = (prompt("Neuer Name für den Ordner:", alt) || "").trim();
    if (name && name !== alt) aendern(g => { g.ordner.find(o => o.id === zustand.ordner).name = name; });
    return;
  }
  else if (b.hasAttribute("data-ordner-loeschen")) {
    if (!confirm(`Ordner „${ordnerName(zustand.ordner)}“ löschen? Die Profile darin bleiben gespeichert, ohne Ordner.`)) return;
    const weg = zustand.ordner; zustand.ordner = "alle"; merke("hsr_ordner", "alle");
    aendern(g => { g.ordner = g.ordner.filter(o => o.id !== weg); Object.values(g.profile).forEach(p => { if (p.ordner === weg) p.ordner = null; }); if (g.zuletzt === weg) g.zuletzt = null; });
    return;
  }
  else if (b.dataset.entfernen) {
    const g = gespeichert.profile[b.dataset.entfernen];
    if (!confirm(`„${g?.name || "Profil"}“ aus der Übersicht nehmen? Die gesammelten Zahlen bleiben erhalten.`)) return;
    aendern(x => { delete x.profile[b.dataset.entfernen]; });
    return;
  }
  else if (b.dataset.plattform) { zustand.plattform = b.dataset.plattform; merke("hsr_plattform", zustand.plattform); }
  else if (b.dataset.zeitraum != null) { zustand.zeitraum = +b.dataset.zeitraum; merke("hsr_zeitraum", zustand.zeitraum); }
  else if (b.dataset.sort) {
    zustand.absteigend = zustand.sort === b.dataset.sort ? !zustand.absteigend : !["name", "plattform"].includes(b.dataset.sort);
    zustand.sort = b.dataset.sort; merke("hsr_sort", zustand.sort); merke("hsr_ab", zustand.absteigend ? "1" : "0");
  }
  else if (b.dataset.schieben) { const i = +b.dataset.i, j = i + +b.dataset.schieben; [layout[i], layout[j]] = [layout[j], layout[i]]; }
  else if (b.dataset.breite) { const l = layout[+b.dataset.breite]; l.breite = l.breite === "halb" ? "voll" : "halb"; }
  else if (b.dataset.weg) { const l = layout[+b.dataset.weg]; l.weg = !l.weg; }
  else return;
  zeichnen();
});

// Hell/Dunkel und Paper (pro Browser gemerkt)
const istDunkel = () => document.documentElement.getAttribute("data-theme") === "dark" || (!document.documentElement.hasAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
function chipsBeschriften() {
  $("thema").textContent = istDunkel() ? "☀ Hell" : "☾ Dunkel";
  $("look").textContent = document.documentElement.getAttribute("data-look") === "paper" ? "▤ Paper an" : "▤ Paper";
}
$("thema").onclick = () => { const neu = istDunkel() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", neu); merke("hsr_theme", neu); chipsBeschriften(); };
$("look").onclick = () => {
  const an = document.documentElement.getAttribute("data-look") !== "paper";
  if (an) document.documentElement.setAttribute("data-look", "paper"); else document.documentElement.removeAttribute("data-look");
  merke("hsr_look", an ? "paper" : "std"); chipsBeschriften();
};

// Kacheln anpassen: verschieben, Breite, ausblenden; Fertig speichert, Escape verwirft, Zurücksetzen = Standard
function bearbeiten(an) {
  document.body.classList.toggle("bearbeiten", an);
  $("layout").textContent = an ? "Fertig" : "Layout anpassen";
  $("zuruecksetzen").hidden = !an;
}
$("layout").onclick = () => {
  if (document.body.classList.contains("bearbeiten")) { chrome.storage.local.set({ dashboardLayout: layout }); layoutVorher = null; bearbeiten(false); }
  else { layoutVorher = structuredClone(layout); bearbeiten(true); }
  zeichnen();
};
$("zuruecksetzen").onclick = () => { layout = structuredClone(LAYOUT_STANDARD); zeichnen(); };
// Profil in einen anderen Ordner (oder „+ Neuer Ordner“ über den Knopf oben)
document.addEventListener("change", e => {
  const sel = e.target.closest("select[data-verschieben]");
  if (sel) aendern(g => { g.profile[sel.dataset.verschieben].ordner = sel.value || null; });
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.body.classList.contains("bearbeiten")) { layout = layoutVorher || layout; layoutVorher = null; bearbeiten(false); zeichnen(); }
});
$("einstellungen").onclick = () => chrome.runtime.openOptionsPage();

// Start: gespeichertes Layout, dann Daten; bei Änderungen im Speicher (Radar sammelt in anderen Tabs) neu zeichnen
chrome.storage.local.get("dashboardLayout").then(({ dashboardLayout }) => {
  if (Array.isArray(dashboardLayout)) layout = LAYOUT_STANDARD.map(s => ({ ...s, ...dashboardLayout.find(l => l.id === s.id) }))
    .sort((a, b) => dashboardLayout.findIndex(l => l.id === a.id) - dashboardLayout.findIndex(l => l.id === b.id));
  chipsBeschriften();
  laden();
});
let neuTimer = 0;
chrome.storage.onChanged.addListener(c => { if (Object.keys(c).some(k => /^(gespeichert|verlauf|cache:|ig:|tt:|fb:|marker|tags|einstellungen)/.test(k))) { clearTimeout(neuTimer); neuTimer = setTimeout(laden, 800); } });
