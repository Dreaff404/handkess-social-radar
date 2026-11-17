// Social-Radar – Plattform-Baustein Instagram (Weg B „Mitlesen“, André 2026-11-03).
// Die Zahlen kommen aus instagram-mitlesen.js (Seitenkontext) per postMessage. Hier: Seiten erkennen, Raster finden,
// Sammeln, Speichern („ig:<name>“) und „Alle laden“ übernimmt sammler.js; hier nur Instagram-Eigenes (Format, Seiten, Views nachladen).
// Stand des Aufbaus 2026-11: Profil-Tabs [role=tablist] (Beiträge / Reels / Markiert), darunter das Raster;
// ein Klick öffnet den Beitrag als Fenster über dem Profil (Adresse /p/<code>/), Hell/Dunkel als Klasse __fb-dark-mode.
const RadarInstagram = (() => {
  const RESERVIERT = new Set(["explore", "direct", "accounts", "reels", "stories", "p", "reel", "tv", "about", "legal", "developer", "web", "emails", "challenge", "session", "privacy", "oauth", "static", "api", "graphql", "your_activity", "notifications", "archive", "saved"]);
  const INSTAGRAM_EPOCHE = 1314220021721n;   // Beitragskennung (pk) >> 23 = Millisekunden seit diesem Zeitpunkt

  // /name/ = Beiträge, /name/reels/ = Reels, /p/<code>/, /reel/<code>/, /name/p/<code>/ = einzelner Beitrag
  function seite(pfad = location.pathname) {
    let m = /^\/(?:([\w.]+)\/)?(p|reel)\/([\w-]+)\/?$/.exec(pfad);
    if (m && (!m[1] || !RESERVIERT.has(m[1].toLowerCase()))) return { schluessel: "ig-beitrag:" + m[3], videoId: m[3], bereich: "video", name: m[1]?.toLowerCase() || null };
    m = /^\/([\w.]+)\/(reels\/)?$/.exec(pfad);
    if (!m || RESERVIERT.has(m[1].toLowerCase())) return null;
    const name = m[1].toLowerCase();
    return { schluessel: `ig:${name}:${m[2] ? "reels" : "beitraege"}`, name, handle: m[1], bereich: m[2] ? "reels" : "beitraege", basis: "/" + m[1] };
  }

  // ---------- Seitenaufbau ----------
  const main = () => document.querySelector("main");
  const tabs = () => main()?.querySelector("[role=tablist]");
  const LINK = 'a[href*="/p/"], a[href*="/reel/"]';
  // Raster = das Element unter den Tabs, das die Beitrags-Links enthält
  function raster() {
    const t = tabs(), a = main()?.querySelector(LINK);
    if (!t || !a) return null;
    let e = a;
    while (e.parentElement && !e.parentElement.contains(t)) e = e.parentElement;
    return e.parentElement ? e : null;
  }
  function anker(bereich) {
    if (bereich === "video") return document.body;   // schwebende Leiste, im Fenster wie auf der Beitragsseite
    const r = raster();
    if (r) return r;
    let t = tabs();                                 // Profil ohne Beiträge: direkt unter die Tabs
    while (t && t.parentElement && t.parentElement !== main()?.firstElementChild?.firstElementChild) t = t.parentElement;
    return t?.nextElementSibling || null;
  }
  const code = href => /\/(?:p|reel)\/([\w-]+)/.exec(href || "")?.[1] || null;
  function kacheln() {
    const r = raster();
    if (!r) return [];
    return [...r.querySelectorAll(LINK)].map(a => ({ el: a, id: code(a.getAttribute("href")), bild: a })).filter(k => k.id);
  }
  // Ganze Hauptfläche beobachten: das Raster entsteht oft erst nach dem Panel und wird beim Nachladen erweitert
  const beobachtung = bereich => bereich === "video" ? { ziel: null } : { ziel: main(), art: { childList: true, subtree: true } };
  const dunkel = () => document.documentElement.classList.contains("__fb-dark-mode");

  // Instagram meldet Seitenwechsel nicht – Adresse alle 400 ms vergleichen
  function beiNavigation(rueckruf) {
    let alt = location.href;
    setInterval(() => { if (location.href !== alt) { alt = location.href; rueckruf(); } }, 400);
    window.addEventListener("popstate", rueckruf);
  }

  // ---------- Daten sammeln (gemeinsamer Sammler, sammler.js) ----------
  function datumAus(m) {
    if (m.taken_at) return new Date(m.taken_at * 1000).toISOString();
    try { return new Date(Number((BigInt(m.pk) >> 23n) + INSTAGRAM_EPOCHE)).toISOString(); } catch { return null; }
  }
  function normal(m) {
    const reel = m.product_type === "clips";
    const hashtags = [...new Set([...(m.text || "").matchAll(/#[\p{L}\p{N}_]+/gu)].map(x => x[0].toLowerCase()))];
    return {
      id: m.code, titel: (m.text || "").split("\n")[0].trim().slice(0, 100) || (reel ? "Reel ohne Text" : "Beitrag ohne Text"),
      url: `https://www.instagram.com/${reel ? "reel" : "p"}/${m.code}/`, bild: m.bild, datum: datumAus(m),
      views: m.versteckt ? null : (m.play_count ?? m.view_count ?? null),
      likes: m.versteckt ? null : m.like_count, kommentare: m.comment_count,
      dauerSek: m.video_duration ? Math.round(m.video_duration) : null,
      typ: reel ? "reel" : m.media_type === 8 ? "karussell" : m.media_type === 2 ? "video" : "bild",
      tags: hashtags, besitzer: m.besitzer?.toLowerCase() || null
    };
  }
  const S = RadarSammler({
    quelle: "instagram", praefix: "ig", listen: ["beitraege", "reels"], normal, seite,
    bereichFuer: (m, pr) => m.typ === "reel" && pr?.listen.reels.length ? "reels" : "beitraege",
    texte: { wartenEinzel: "Warte auf die Zahlen dieses Beitrags von Instagram …", wartenListe: "Warte auf Beiträge von Instagram … (Seite einmal scrollen oder „Alle laden“)" }
  });
  const { profile, medien } = S;

  // ---------- Views älterer Reels ----------
  // Das Beiträge-Raster liefert für Reels keine Views; die gibt es nur in den Daten des Reels-Tabs.
  // „Views nachladen“: kurz in den Reels-Tab, dort langsam scrollen, bis alle fehlenden Reels gefunden sind, dann zurück.
  const MERKER = "socialRadarViewsNachladen";
  const ohneViews = name => (profile[name]?.listen.beitraege || []).filter(c => medien[c]?.typ === "reel" && medien[c].views == null);
  function viewsNachladen(name) {
    try { sessionStorage.setItem(MERKER, JSON.stringify({ name, codes: ohneViews(name), bis: Date.now() + 10 * 60000 })); } catch { }
    tabOeffnen(name, "reels/");
  }
  // Tab per Klick auf Instagrams eigenen Tab (ohne Neuladen), sonst über die Adresse
  function tabOeffnen(name, teil) {
    const a = tabs()?.querySelector(`a[href="/${name}/${teil}" i]`) || [...(tabs()?.querySelectorAll("a") || [])].find(x => x.getAttribute("href")?.toLowerCase() === `/${name}/${teil}`);
    if (a) a.click(); else location.href = `/${name}/${teil}`;
  }
  // Auf dem Reels-Tab: läuft ein Nachladen-Auftrag für dieses Profil? Dann gibt das Panel ihn hier ab.
  function auftrag(s) {
    if (s?.bereich !== "reels") return null;
    let m = null;
    try { m = JSON.parse(sessionStorage.getItem(MERKER) || "null"); } catch { }
    if (!m || m.name !== s.name || m.bis < Date.now()) return null;
    try { sessionStorage.removeItem(MERKER); } catch { }
    const offen = () => m.codes.filter(c => medien[c]?.views == null);
    return {
      text: `Lade Views für ${m.codes.length} Reels nach …`,
      fertigWenn: () => offen().length === 0,
      danach: () => { const rest = offen().length; tabOeffnen(m.name, ""); return rest; }
    };
  }

  const ranglistePfad = d => "/" + (d.kanal.handle || "") + "/" + (d.bereich === "reels" ? "reels/" : "");

  return {
    id: "instagram", name: "Instagram", seite, raster, anker, beobachtung, kacheln, vorschaubilder: kacheln, dunkel, beiNavigation,
    laden: S.laden, ranglistePfad, alleLaden: S.alleLaden, laeuft: S.laeuft, ohneViews: d => ohneViews(d.kanal.handle?.toLowerCase()), viewsNachladen, auftrag, beiNeuenDaten: S.beiNeuenDaten,
    schwebend: bereich => bereich === "video", dunkelAttribut: "class", bildFormat: "4/5",
    mitRaster: bereich => bereich === "beitraege" || bereich === "reels",
    bereichName: { beitraege: "Beiträge", reels: "Reels" },
    begriffe: { follower: "Follower", folgerKurz: "Follower", einheit: "Beitrag", einheiten: "Beiträge", dieses: "Dieser Beitrag", kanal: "Profil", tagsCreator: "Hashtags", keineTags: "In der Beschreibung stehen keine Hashtags.", ladeKnopf: "Alle laden" }
  };
})();
var RadarPlattform = RadarInstagram;
