// Social-Radar – Plattform-Baustein Facebook (Mitlesen wie Instagram, M4 André 2026-11-04). Braucht eine Anmeldung.
// Zahlen aus facebook-mitlesen.js; Sammeln, Speichern („fb:<name>“) und „Alle laden“ übernimmt sammler.js.
// SPERRE FÜR NUTZERPROFILE: Das Radar erscheint nur, wenn das Mitlese-Skript die Adresse als Seite bestätigt hat
// (Beiträge mit Seitenverknüpfung). Auf privaten Profilen gibt es kein Panel, keine Overlays, nichts wird gespeichert.
// Stand des Aufbaus 2026-11: /name (Beiträge als Feed, Beiträge = [role=article] ohne umschließenden Artikel), /name/reels/ (Raster
// aus Links /reel/<id>), Follower nur als gerundeter Text („51 Mio. Follower“), Hell/Dunkel als Klasse __fb-dark-mode.
const RadarFacebook = (() => {
  const RESERVIERT = new Set(["watch", "reel", "reels", "groups", "events", "marketplace", "gaming", "friends", "messages", "notifications", "settings", "help", "pages", "profile.php", "stories", "photo", "photos", "videos", "search", "login", "hashtag", "bookmarks", "saved", "ads", "business", "privacy", "policies", "me", "home.php", "permalink.php", "story.php", "share", "sharer", "dialog", "plugins", "l.php"]);
  const bestaetigt = new Set();          // Namen, die als Seite erkannt sind
  let navRueckruf = () => { };

  // /name = Beiträge, /name/reels/ = Reels; /reel/<id>, /name/posts/<id>, /name/videos/<id>, /watch/?v=<id> = einzelner Beitrag
  function rohSeite(pfad = location.pathname, suche = location.search) {
    let m = /^\/reel\/(\d+)\/?$/.exec(pfad) || /^\/[\w.-]+\/(?:posts|videos)\/(?:[^/]+\/)?([\w]+)\/?$/.exec(pfad);
    if (m) return { schluessel: "fb-beitrag:" + m[1], videoId: m[1], bereich: "video", name: /^\/([\w.-]+)\/(?:posts|videos)\//.exec(pfad)?.[1]?.toLowerCase() || null };
    if (/^\/watch\/?$/.test(pfad)) { const v = new URLSearchParams(suche).get("v"); return v ? { schluessel: "fb-beitrag:" + v, videoId: v, bereich: "video", name: null } : null; }
    m = /^\/([\w.-]+)\/?(reels\/?)?$/.exec(pfad);
    if (!m || RESERVIERT.has(m[1].toLowerCase())) return null;
    const name = m[1].toLowerCase();
    return { schluessel: `fb:${name}:${m[2] ? "reels" : "beitraege"}`, name, handle: m[1], bereich: m[2] ? "reels" : "beitraege", basis: "/" + m[1] };
  }
  // Profilseiten nur, wenn als Seite bestätigt – sonst ist das Radar dort gar nicht da
  function seite() {
    const s = rohSeite();
    if (!s || s.bereich === "video") return s;
    return bestaetigt.has(s.name) ? s : null;
  }

  // ---------- Seitenaufbau ----------
  // Beiträge im Feed sind bei Facebook (2026-11) nicht als Artikel gekennzeichnet – nur die eingeblendeten Kommentare ([role=article]).
  // Die Beitragskennung steckt in Links innerhalb des Beitrags (Kommentar-Links /posts/<id>?comment_id=…, Video-/Reel-Links).
  // Feed-Liste = gemeinsamer Rahmen von Links mit verschiedenen Kennungen; Beitrag = Kind der Feed-Liste, das den Link enthält.
  const main = () => document.querySelector("[role=main]");
  const kennung = href => /\/reel\/(\d+)/.exec(href || "")?.[1] || /\/videos\/(?:[^/?]+\/)?(\d+)/.exec(href || "")?.[1] || /\/posts\/([\w]+)/.exec(href || "")?.[1] || /\/watch\/?\?(?:.*&)?v=(\d+)/.exec(href || "")?.[1]
    || /\/photo\/?\?(?:.*&)?fbid=(\d+)/.exec(href || "")?.[1] || /\/photos\/[^/]+\/(\d+)/.exec(href || "")?.[1] || null;
  function gemeinsam(a, b) { let e = a; while (e && !e.contains(b)) e = e.parentElement; return e; }
  // Fotolinks gibt es auch im Seitenkopf (Titel- und Profilbild) – sie zählen nur innerhalb der schon gefundenen Feed-Liste
  const mitKennung = (wurzel = main(), fotos = false) => [...(wurzel?.querySelectorAll('a[href*="/posts/"], a[href*="/reel/"], a[href*="/videos/"], a[href*="watch"]' + (fotos ? ', a[href*="/photo"]' : "")) || [])]
    .map(a => ({ a, id: kennung(a.getAttribute("href")) })).filter(x => x.id);
  function feedListe() {
    const l = mitKennung();
    const erster = l[0], anderer = l.find(x => x.id !== erster?.id);
    if (!erster || !anderer) return null;
    return gemeinsam(erster.a, anderer.a);
  }
  function raster() {
    const s = rohSeite();
    if (s?.bereich === "reels") {
      const l = [...(main()?.querySelectorAll('a[href*="/reel/"]') || [])].filter(a => a.querySelector("img"));
      return l.length >= 2 ? gemeinsam(l[0], l[l.length - 1]) : l[0]?.parentElement || null;
    }
    return feedListe();
  }
  const anker = bereich => bereich === "video" ? document.body : raster();
  function kacheln() {
    const s = rohSeite();
    if (s?.bereich === "reels") return [...(raster()?.querySelectorAll('a[href*="/reel/"]') || [])].filter(a => a.querySelector("img")).map(a => ({ id: kennung(a.getAttribute("href")), bild: a })).filter(k => k.id);
    const liste = feedListe();
    if (!liste) return [];
    const je = new Map();   // Beitrag (Kind der Feed-Liste) → Kennung (erster Treffer zählt)
    mitKennung(liste, true).forEach(({ a, id }) => {
      let e = a;
      while (e && e.parentElement !== liste) e = e.parentElement;
      if (e && !je.has(e)) je.set(e, id);
    });
    // Fotolinks tragen die Foto-Kennung – über das Gesammelte dem Beitrag zuordnen
    const foto = new Map(Object.values(medien).filter(m => m.fotoId).map(m => [m.fotoId, m.id]));
    return [...je].map(([bild, id]) => ({ id: medien[id] ? id : foto.get(id) || id, bild }));
  }
  const beobachtung = bereich => bereich === "video" ? { ziel: null } : { ziel: main() || document.body, art: { childList: true, subtree: true } };
  const dunkel = () => document.documentElement.classList.contains("__fb-dark-mode");

  // Follower aus dem Seitenkopf: „51 Mio. Follower“, „12.345 Follower“, „1,2K followers“
  function followerAusKopf() {
    const t = main()?.innerText.slice(0, 600) || "";
    const m = /([\d.,]+)\s*(Mio\.|Mrd\.|Tsd\.|[KMB])?\s*(Follower|followers)/i.exec(t);
    if (!m) return null;
    const faktor = { "Tsd.": 1e3, "Mio.": 1e6, "Mrd.": 1e9, K: 1e3, M: 1e6, B: 1e9, k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1;
    const zahl = faktor > 1 ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : parseFloat(m[1].replace(/[.,]/g, ""));
    return Math.round(zahl * faktor);
  }

  // Bestätigung vom Mitlese-Skript: diese Adresse ist eine Seite → Radar starten, Follower aus dem Kopf melden
  window.addEventListener("message", e => {
    if (e.source !== window || e.data?.quelle !== "facebook" || !e.data.seite) return;
    const { name } = e.data.seite;
    const neu = !bestaetigt.has(name);
    bestaetigt.add(name);
    const f = followerAusKopf();
    if (f) window.postMessage({ socialRadar: 1, quelle: "facebook", profile: [{ username: name, follower: f, name: document.querySelector("[role=main] h1")?.innerText.trim() || name, genau: false }] }, location.origin);
    if (neu && rohSeite()?.name === name) navRueckruf();
  });

  function beiNavigation(rueckruf) {
    navRueckruf = rueckruf;
    let alt = location.href;
    setInterval(() => { if (location.href !== alt) { alt = location.href; rueckruf(); } }, 400);
    window.addEventListener("popstate", rueckruf);
  }

  // ---------- Daten ----------
  function normal(m) {
    const reel = m.typ === "reel";
    return {
      id: m.id, titel: (m.text || "").split("\n")[0].trim().slice(0, 100) || (reel ? "Reel" : m.typ === "video" ? "Video" : "Beitrag ohne Text"),
      url: m.url || (reel ? `https://www.facebook.com/reel/${m.id}/` : ""), bild: m.bild,
      datum: m.zeit ? new Date(m.zeit * 1000).toISOString() : null,
      views: m.views, likes: m.reaktionen, kommentare: m.kommentare, shares: m.shares,
      dauerSek: m.dauerMs ? Math.round(m.dauerMs / 1000) : null, typ: m.typ, fotoId: m.fotoId || null,
      tags: [...new Set([...(m.text || "").matchAll(/#[\p{L}\p{N}_]+/gu)].map(x => x[0].toLowerCase()))], besitzer: null
    };
  }
  const S = RadarSammler({
    quelle: "facebook", praefix: "fb", listen: ["beitraege", "reels"], normal, seite: rohSeite, raster, geduld: 6,
    bereichFuer: (m, pr) => m.typ === "reel" && pr?.listen.reels.length ? "reels" : "beitraege",
    texte: { wartenEinzel: "Warte auf die Zahlen dieses Beitrags von Facebook …", wartenListe: "Warte auf Beiträge von Facebook … (Seite einmal scrollen oder „Alle laden“)" }
  });
  const { profile, medien } = S;

  // ---------- Views von Reels (wie Instagram: Feed hat keine Views, der Reels-Tab schon) ----------
  const MERKER = "socialRadarFbViewsNachladen";
  const ohneViews = name => (profile[name]?.listen.beitraege || []).filter(c => medien[c]?.typ === "reel" && medien[c].views == null);
  function tabOeffnen(name, teil) {
    const ziel = `/${name}/${teil}`.toLowerCase();
    const a = [...(main()?.querySelectorAll("a[href]") || [])].find(x => new URL(x.href, location.href).pathname.toLowerCase().replace(/\/$/, "") === ziel.replace(/\/$/, ""));
    if (a) a.click(); else location.href = ziel;
  }
  function viewsNachladen(name) {
    try { sessionStorage.setItem(MERKER, JSON.stringify({ name, codes: ohneViews(name), bis: Date.now() + 10 * 60000 })); } catch { }
    tabOeffnen(profile[name]?.kanal.handle || name, "reels/");
  }
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
      danach: () => { const rest = offen().length; tabOeffnen(profile[m.name]?.kanal.handle || m.name, ""); return rest; }
    };
  }

  const ranglistePfad = d => "/" + (d.kanal.handle || "") + "/" + (d.bereich === "reels" ? "reels/" : "");

  return {
    id: "facebook", name: "Facebook", seite, raster, anker, beobachtung, kacheln, vorschaubilder: kacheln, dunkel, beiNavigation,
    laden: S.laden, ranglistePfad, alleLaden: S.alleLaden, laeuft: S.laeuft, beiNeuenDaten: S.beiNeuenDaten,
    ohneViews: d => ohneViews(d.kanal.handle?.toLowerCase()), viewsNachladen, auftrag,
    schwebend: bereich => bereich === "video", dunkelAttribut: "class", bildFormat: "4/5",
    mitRaster: bereich => bereich === "beitraege" || bereich === "reels",
    extraSort: [["shares", "Shares"]],
    bereichName: { beitraege: "Beiträge", reels: "Reels" },
    begriffe: { likes: "Reaktionen", likeQuote: "Reaktions-Quote", follower: "Follower", folgerKurz: "Follower", einheit: "Beitrag", einheiten: "Beiträge", dieses: "Dieser Beitrag", kanal: "Profil", tagsCreator: "Hashtags", keineTags: "Im Text stehen keine Hashtags.", ladeKnopf: "Alle laden" }
  };
})();
var RadarPlattform = RadarFacebook;
