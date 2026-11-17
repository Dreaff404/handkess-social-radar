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
