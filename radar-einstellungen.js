// Social-Radar – Einstellungsseite (radar-einstellungen.html): API-Schlüssel, Grenzwerte, Abrufmenge, Zwischenspeicher.
const STANDARD = { gruen: 5, rot: 1, maxVideos: 200, cacheStunden: 6 };
const $ = id => document.getElementById(id);
const melden = (text, art = "ok") => { $("meldung").textContent = text; $("meldung").className = art; };

chrome.storage.local.get(["schluessel", "einstellungen"], ({ schluessel = "", einstellungen = {} }) => {
  $("schluessel").value = schluessel;
  const e = { ...STANDARD, ...einstellungen };
  Object.keys(STANDARD).forEach(k => { $(k).value = e[k]; });
});

$("zeigen").onclick = () => {
  const f = $("schluessel");
  f.type = f.type === "password" ? "text" : "password";
  $("zeigen").textContent = f.type === "password" ? "Zeigen" : "Verbergen";
};

$("speichernSchluessel").onclick = () => {
  const s = $("schluessel").value.trim();
  if (s && !/^[\w-]{30,60}$/.test(s)) return melden("Das sieht nicht nach einem API-Schlüssel aus.", "fehler");
  chrome.storage.local.set({ schluessel: s }, () => melden(s ? "Schlüssel gespeichert." : "Schlüssel entfernt."));
};

$("testen").onclick = () => {
  const s = $("schluessel").value.trim();
  if (!s) return melden("Erst einen Schlüssel eintragen.", "fehler");
  melden("Teste …", "");
  chrome.runtime.sendMessage({ typ: "schluesselTesten", schluessel: s }, a => {
    if (a?.ok) melden("Schlüssel funktioniert.");
    else melden(a?.fehler || "Keine Antwort.", "fehler");
  });
};

$("speichernAuswertung").onclick = () => {
  const e = {};
  for (const k of Object.keys(STANDARD)) {
    const w = parseFloat($(k).value);
    if (!(w >= 0)) return melden("Bitte nur Zahlen eintragen.", "fehler");
    e[k] = w;
  }
  if (e.rot > e.gruen) return melden("„Schwach unter“ muss kleiner sein als „gut ab“.", "fehler");
  e.maxVideos = Math.min(1000, Math.max(50, Math.round(e.maxVideos / 50) * 50));
  e.cacheStunden = Math.min(168, Math.max(1, Math.round(e.cacheStunden)));
  chrome.storage.local.set({ einstellungen: e }, () => { Object.keys(e).forEach(k => { $(k).value = e[k]; }); melden("Gespeichert."); });
};

$("cacheLeeren").onclick = () => {
  chrome.storage.local.get(null, alles => {
    const weg = Object.keys(alles).filter(k => k.startsWith("cache:"));
    chrome.storage.local.remove(weg, () => melden(`Zwischenspeicher geleert (${weg.length} Kanäle). Hashtags und Marker bleiben.`));
  });
};

// ---------- Automatisch nachladen (v2.2, in Entwicklung) ----------
// Nur gespeicherte YouTube-Kanäle, höchstens 10, frühestens stündlich. Der Wecker selbst lebt in radar-hintergrund.js.
const AUTO_MAX = 10;
let autoKanaele = [];
function autoKosten() {
  const n = document.querySelectorAll("#autoListe input:checked").length;
  $("autoKosten").textContent = n ? `${n} von ${AUTO_MAX} Kanälen · etwa ${n * 10} von 10.000 Einheiten pro Tag (sparsam: nur die neuesten Videos und Shorts)` : "Kein Kanal ausgewählt – es wird nur beim Öffnen gemessen.";
}
// API-Verbrauch heute (Neustart 9 Uhr deutscher Zeit): automatische Abrufe dürfen höchstens das Auto-Budget nutzen
function verbrauchZeigen() {
  chrome.runtime.sendMessage({ typ: "verbrauch" }, v => {
    if (chrome.runtime.lastError || !v) return;
    const pz = n => Math.min(100, n / v.kontingent * 100);
    $("verbrauchAuto").style.width = pz(v.auto) + "%";
    $("verbrauchHand").style.left = pz(v.auto) + "%"; $("verbrauchHand").style.width = pz(v.einheiten - v.auto) + "%";
    $("verbrauchGrenze").style.left = pz(v.autoBudget) + "%";
    $("verbrauchText").textContent = `${v.einheiten.toLocaleString("de-DE")} von ${v.kontingent.toLocaleString("de-DE")} Einheiten verbraucht (davon automatisch ${v.auto.toLocaleString("de-DE")}, Grenze für Automatik ${v.autoBudget.toLocaleString("de-DE")}). Der Rest bleibt als Puffer für dein eigenes Öffnen von Kanälen.`;
  });
}
function trackZeigen() {
  chrome.storage.local.get("getrackt", ({ getrackt = {} }) => {
    const e = Object.entries(getrackt);
    $("trackListe").innerHTML = e.length ? e.map(([id, t]) => `<div class="track"><span>${String(t.titel || id).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]))} <span class="leise">· ${Object.keys(t.messungen || {}).filter(k => k !== "start").length} von 7 Zeitpunkten gemessen</span></span><button data-stopp="${id}">Beenden</button></div>`).join("")
      : "Kein Video wird getrackt. Auf einer Videoseite „◎ Video tracken“ klicken (höchstens 20).";
  });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-stopp]"); if (!b) return;
  chrome.runtime.sendMessage({ typ: "tracken", id: b.dataset.stopp, an: false }, () => { trackZeigen(); melden("Tracking beendet."); });
});
verbrauchZeigen(); trackZeigen();
chrome.storage.local.get(["gespeichert", "autoNachladen", "autoNachladenStand"], ({ gespeichert = {}, autoNachladen = {}, autoNachladenStand }) => {
  autoKanaele = Object.values(gespeichert.profile || {}).filter(p => p.plattform === "youtube");
  const an = new Set((autoNachladen.kanaele || []).map(k => k.kanalId));
  $("autoListe").innerHTML = autoKanaele.length ? autoKanaele.map((p, i) => `<label><input type="checkbox" data-i="${i}" ${an.has(p.kanalId) ? "checked" : ""}> ${String(p.name || p.handle || p.kanalId).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]))}</label>`).join("")
    : `<div class="leise">Noch keine YouTube-Kanäle gespeichert – im Radar auf „☆ Speichern“ klicken.</div>`;
  if (autoNachladenStand) $("autoStand").textContent = `Zuletzt nachgeladen: ${new Date(autoNachladenStand.zeit).toLocaleString("de-DE")} · ${autoNachladenStand.anzahl} Kanäle${autoNachladenStand.ok ? "" : " · Fehler: " + autoNachladenStand.fehler}`;
  autoKosten();
});
document.addEventListener("change", e => {
  if (e.target.closest("#autoListe input") && document.querySelectorAll("#autoListe input:checked").length > AUTO_MAX) { e.target.checked = false; melden(`Höchstens ${AUTO_MAX} Kanäle.`, "fehler"); }
  if (e.target.closest("#autoListe")) autoKosten();
});
$("speichernAuto").onclick = () => {
  const kanaele = [...document.querySelectorAll("#autoListe input:checked")].map(c => autoKanaele[+c.dataset.i]).map(p => ({ kanalId: p.kanalId, handle: p.handle || "" }));
  chrome.storage.local.set({ autoNachladen: { kanaele } }, () => melden(kanaele.length ? `Tägliches Nachladen für ${kanaele.length} Kanäle eingerichtet.` : "Automatisches Nachladen ausgeschaltet."));
};
$("jetztAuto").onclick = () => {
  melden("Lade nach …", "");
  chrome.runtime.sendMessage({ typ: "jetztNachladen" }, a => {
    if (!a || a.zeit == null) return melden(a?.fehler || "Keine Antwort.", "fehler");   // Teilerfolg (einzelne Kanäle mit Fehler) zählt als Ergebnis
    $("autoStand").textContent = `Zuletzt nachgeladen: ${new Date(a.zeit).toLocaleString("de-DE")} · ${a.anzahl} Kanäle${a.ok ? "" : " · Fehler: " + a.fehler}`;
    verbrauchZeigen();
    melden(!a.anzahl ? "Kein Kanal ausgewählt – erst anhaken und speichern." : a.ok ? "Nachgeladen." : "Nachgeladen, aber nicht alle Kanäle: " + a.fehler, a.anzahl && a.ok ? "ok" : "fehler");
  });
};
