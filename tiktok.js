// Social-Radar – Plattform-Baustein TikTok (Weg „Mitlesen“ wie Instagram, M3 André 2026-11-03). Funktioniert ohne Anmeldung.
// Zahlen aus tiktok-mitlesen.js; Sammeln, Speichern („tt:<name>“) und „Alle laden“ übernimmt sammler.js.
// Stand des Aufbaus 2026-11: Profil /@name, Raster #user-post-item-list mit Links /@name/video/<id> (Fotos: /photo/<id>),
// Views als [data-e2e=video-views] auf dem Vorschaubild; ein Klick öffnet das Video als Ansicht über dem Profil (/@name/video/<id>);
// Hell/Dunkel als data-theme am Dokument.
const RadarTikTok = (() => {
  // /@name = Videos, /@name/video/<id> oder /@name/photo/<id> = einzelnes Video
  function seite(pfad = location.pathname) {
    let m = /^\/@([\w.-]+)\/(?:video|photo)\/(\d+)\/?$/.exec(pfad);
    if (m) return { schluessel: "tt-video:" + m[2], videoId: m[2], bereich: "video", name: m[1].toLowerCase() };
    m = /^\/@([\w.-]+)\/?$/.exec(pfad);
    if (!m) return null;
    const name = m[1].toLowerCase();
    return { schluessel: `tt:${name}:videos`, name, handle: m[1], bereich: "videos", basis: "/@" + m[1] };
  }

  // ---------- Seitenaufbau ----------
  const raster = () => document.getElementById("user-post-item-list");
  const anker = bereich => bereich === "video" ? document.body : raster();
  const LINK = 'a[href*="/video/"], a[href*="/photo/"]';
  const kennung = href => /\/(?:video|photo)\/(\d+)/.exec(href || "")?.[1] || null;
  function kacheln() {
    const r = raster();
    if (!r) return [];
    return [...r.querySelectorAll(LINK)].map(a => ({ el: a, id: kennung(a.getAttribute("href")), bild: a })).filter(k => k.id);
  }
  const beobachtung = bereich => bereich === "video" ? { ziel: null }
    : { ziel: document.getElementById("main-content-others_homepage") || document.body, art: { childList: true, subtree: true } };
  const dunkel = () => document.documentElement.getAttribute("data-theme") === "dark";

  // TikTok meldet Seitenwechsel nicht – Adresse alle 400 ms vergleichen
  function beiNavigation(rueckruf) {
    let alt = location.href;
    setInterval(() => { if (location.href !== alt) { alt = location.href; rueckruf(); } }, 400);
    window.addEventListener("popstate", rueckruf);
  }

  // ---------- Daten ----------
  function normal(m) {
    const name = m.autor || "";
    return {
      id: m.id, titel: (m.desc || "").split("\n")[0].trim().slice(0, 100) || (m.foto ? "Foto-Beitrag ohne Text" : "Video ohne Text"),
      url: `https://www.tiktok.com/@${name}/${m.foto ? "photo" : "video"}/${m.id}`, bild: m.cover,
      datum: m.createTime ? new Date(m.createTime * 1000).toISOString() : null,
      views: m.playCount, likes: m.diggCount, kommentare: m.commentCount, shares: m.shareCount, saves: m.collectCount,
      dauerSek: m.duration || null, typ: m.foto ? "foto" : "video", angepinnt: m.angepinnt,
      tags: [...new Set(m.hashtags.map(t => "#" + t.toLowerCase()))], besitzer: name.toLowerCase() || null
    };
  }
  const S = RadarSammler({
    quelle: "tiktok", praefix: "tt", listen: ["videos"], normal, seite, bereichFuer: () => "videos",
    texte: { wartenEinzel: "Warte auf die Zahlen dieses Videos von TikTok …", wartenListe: "Warte auf Videos von TikTok … (Seite einmal scrollen oder „Alle laden“)" }
  });

  const ranglistePfad = d => "/@" + (d.kanal.handle || "");

  return {
    id: "tiktok", name: "TikTok", seite, raster, anker, beobachtung, kacheln, vorschaubilder: kacheln, dunkel, beiNavigation,
    laden: S.laden, ranglistePfad, alleLaden: S.alleLaden, laeuft: S.laeuft, beiNeuenDaten: S.beiNeuenDaten,
    schwebend: bereich => bereich === "video", dunkelAttribut: "data-theme", bildFormat: "3/4",
    mitRaster: bereich => bereich === "videos",
    extraSort: [["shares", "Shares"], ["saves", "Saves"]],
    bereichName: { videos: "Videos" },
    begriffe: { follower: "Follower", folgerKurz: "Follower", einheit: "Video", einheiten: "Videos", dieses: "Dieses Video", kanal: "Profil", tagsCreator: "Hashtags", keineTags: "In der Beschreibung stehen keine Hashtags.", ladeKnopf: "Alle laden" }
  };
})();
var RadarPlattform = RadarTikTok;
