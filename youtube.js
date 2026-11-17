// Social-Radar – Plattform-Baustein YouTube: erkennt Kanalseiten, findet Raster und Vorschaubilder.
// Alles, was von YouTubes Seitenaufbau abhängt, steht hier. Stand des Aufbaus: 2026-11 (yt-lockup-view-model);
// der ältere Aufbau (a#thumbnail) wird weiter erkannt.
const RadarYouTube = (() => {
  // Kanal und Bereich aus der Adresse: /@name (Übersicht), /@name/featured, /@name/videos, /@name/shorts, /channel/UC…/…
  function seite(pfad = location.pathname, suche = location.search) {
    if (pfad === "/watch") {
      const v = new URLSearchParams(suche).get("v");
      return v ? { schluessel: "video:" + v, videoId: v, bereich: "video" } : null;
    }
    const m = /^\/(@[^/]+|channel\/(UC[\w-]{22}))(?:\/(videos|shorts|featured))?\/?$/.exec(pfad);
    if (!m) return null;
    const handle = m[2] ? null : decodeURIComponent(m[1]);
    const bereich = m[3] === "videos" || m[3] === "shorts" ? m[3] : "uebersicht";
    return { schluessel: (handle || m[2]) + ":" + bereich, handle, kanalId: m[2] || null, bereich, basis: "/" + m[1] };
  }

  // Sichtbare Kanal-Seite (YouTube behält alte Seiten versteckt im Dokument)
  const browse = () => document.querySelector('ytd-browse[page-subtype="channels"]:not([hidden])') || document.querySelector("ytd-browse:not([hidden])");
  const raster = () => browse()?.querySelector("ytd-rich-grid-renderer");
  const rasterInhalt = () => raster()?.querySelector(":scope > #contents");

  // Video-Kennung aus einem Link
  function videoId(href) {
    if (!href) return null;
    const s = /\/shorts\/([\w-]{11})/.exec(href);
    if (s) return s[1];
    const w = /[?&]v=([\w-]{11})/.exec(href);
    return w ? w[1] : null;
  }

  // Alle geladenen Kacheln im YouTube-Raster mit Kennung und Vorschaubild-Element
  function kacheln() {
    const inhalt = rasterInhalt();
    if (!inhalt) return [];
    return [...inhalt.querySelectorAll(":scope > ytd-rich-item-renderer")].map(el => {
      const links = [...el.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]')];
      const bild = links.find(a => a.querySelector("img")) || el.querySelector("a#thumbnail") || links[0];
      return { el, id: videoId(links[0]?.getAttribute("href")), bild };
    }).filter(k => k.id && k.bild);
  }

  // Übersicht: Reihen statt Raster (ytd-section-list-renderer). Das Panel sitzt davor, Overlays kommen auf jedes Vorschaubild.
  const abschnitte = () => browse()?.querySelector("#primary > ytd-section-list-renderer, ytd-section-list-renderer");
  // Videoseite: Leiste direkt unter dem Player, vor Titel und Kanalzeile (ytd-watch-metadata)
  const unterPlayer = () => document.querySelector("ytd-watch-flexy:not([hidden]) #below ytd-watch-metadata");
  const anker = bereich => bereich === "video" ? unterPlayer() : bereich === "uebersicht" ? abschnitte() : raster();
  const beobachtung = bereich => bereich === "video" ? { ziel: null } : bereich === "uebersicht"
    ? { ziel: abschnitte(), art: { childList: true, subtree: true } }
    : { ziel: rasterInhalt(), art: { childList: true } };

  // Alle Vorschaubilder der sichtbaren Seite (Links auf ein Video, die ein Bild enthalten)
  function vorschaubilder() {
    const b = browse();
    if (!b) return [];
    return [...b.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]')]
      .filter(a => a.querySelector("img"))
      .map(a => ({ id: videoId(a.getAttribute("href")), bild: a })).filter(k => k.id);
  }

  const dunkel = () => document.documentElement.hasAttribute("dark");

  // YouTube lädt Seiten ohne Neuladen; nach jedem Wechsel meldet es yt-navigate-finish
  function beiNavigation(rueckruf) {
    window.addEventListener("yt-navigate-finish", rueckruf);
    window.addEventListener("popstate", rueckruf);
  }

  // ---------- Daten: über radar-hintergrund.js von der YouTube Data API ----------
  const nachricht = n => new Promise(fertig => {
    try { chrome.runtime.sendMessage(n, a => fertig(chrome.runtime.lastError ? null : a)); }
    catch { fertig({ fehler: "Die Erweiterung wurde neu geladen. Bitte die Seite neu laden." }); }
  });
  const KEINE_ANTWORT = { fehler: "Keine Antwort von der Erweiterung. Seite neu laden." };

  // Ergebnis für das Panel: { daten, zweit?, einzel?, hinweis? } oder { fehler } / { ohneSchluessel }
  async function laden(s, neu) {
    if (s.bereich === "video") {
      const v = await nachricht({ typ: "video", id: s.videoId, neu });
      if (!v) return KEINE_ANTWORT;
      if (v.ohneSchluessel || v.fehler) return v;
      // Kanal des Videos: lange Videos; ist das Video dort nicht dabei, die Shorts
      let k = await nachricht({ typ: "kanal", kanalId: v.kanalId, bereich: "videos", neu });
      if (k && !k.fehler && !k.videos.some(x => x.id === v.id)) {
        const ks = await nachricht({ typ: "kanal", kanalId: v.kanalId, bereich: "shorts", neu });
        if (ks && !ks.fehler && !ks.gemischt && ks.videos.some(x => x.id === v.id)) k = ks;
      }
      const ok = k && !k.fehler;
      return {
        daten: ok ? k : { kanal: { id: v.kanalId, name: v.kanalName, follower: 0 }, videos: [], bereich: "videos", geladenAm: v.geladenAm },
        einzel: { ...v, url: location.href },
        hinweis: ok ? "" : (k?.fehler || "Kanaldaten fehlen.") + " Die Einordnung im Kanal fehlt deshalb."
      };
    }
    const ueb = s.bereich === "uebersicht";
    const a = await nachricht({ typ: "kanal", handle: s.handle, kanalId: s.kanalId, bereich: ueb ? "videos" : s.bereich, neu });
    if (!a) return KEINE_ANTWORT;
    if (a.ohneSchluessel || a.fehler) return a;
    // Übersicht: dazu die Shorts – ohne getrennte Shorts-Liste (gemischt) oder bei Fehler kein Shorts-Block
    const b = ueb ? await nachricht({ typ: "kanal", handle: s.handle, kanalId: s.kanalId, bereich: "shorts", neu }) : null;
    return { daten: a, zweit: b && !b.fehler && !b.gemischt ? b : null };
  }

  const ranglistePfad = d => (d.kanal.handle ? "/" + d.kanal.handle.replace(/^(?!@)/, "@") : "/channel/" + d.kanal.id) + "/" + (d.bereich === "shorts" ? "shorts" : "videos");

  return {
    id: "youtube", name: "YouTube", seite, raster, rasterInhalt, anker, beobachtung, kacheln, vorschaubilder, videoId, dunkel, beiNavigation,
    laden, ranglistePfad, dunkelAttribut: "dark", bildFormat: "16/9",
    mitRaster: bereich => bereich === "videos" || bereich === "shorts",
    bereichName: { videos: "Videos", shorts: "Shorts", uebersicht: "Übersicht" },
    begriffe: { follower: "Abonnenten", folgerKurz: "Abos", einheit: "Video", einheiten: "Videos", dieses: "Dieses Video", kanal: "Kanal", tagsCreator: "Tags", keineTags: "Der Creator hat keine Tags hinterlegt.", ladeKnopf: "Neu laden" }
  };
})();
var RadarPlattform = RadarYouTube;
