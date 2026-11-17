// Social-Radar – Mitleser für Facebook (läuft im Seitenkontext, vor Facebooks eigenen Skripten).
// Liest nur mit, was Facebook ohnehin lädt (/api/graphql/) – keine eigenen Anfragen, nichts verlässt den Browser.
// SPERRE FÜR NUTZERPROFILE (André, 2026-11-04): Weitergegeben werden nur Beiträge von Seiten – erkennbar an der
// Seitenverknüpfung (delegate_page) des Autors. Beiträge privater Profile verlassen dieses Skript nie.
// Stand des Aufbaus 2026-11: Feed-Beitrag = Story (post_id, creation_time, permalink_url, comet_sections …, Zahlen im feedback:
// reaction_count.count, share_count.count, comment_rendering_instance.comments.total_count); Reels-Tab = profile_reel_node
// (attachments[].media: id, play_count_reduced, created_time, playable_duration_in_ms, owner.delegate_page).
(() => {
  const PASST = /\/api\/graphql/;

  function finde(o, test, tiefe = 0) {
    if (!o || typeof o !== "object" || tiefe > 30) return null;
    if (!Array.isArray(o) && test(o)) return o;
    for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = finde(v, test, tiefe + 1); if (r) return r; }
    return null;
  }
  const zahl = v => v == null ? null : typeof v === "number" ? v : Number(String(v).replace(/[^\d]/g, "")) || 0;
  const kennungAus = url => /\/reel\/(\d+)/.exec(url || "")?.[1] || /\/videos\/(?:[^/]+\/)?(\d+)/.exec(url || "")?.[1] || /\/posts\/([\w]+)/.exec(url || "")?.[1] || null;
  // Profil der Seite aus der Adresse: /name, /name/reels/ → „name“
  const pfadName = () => /^\/([\w.-]+)\/?(?:reels\/?)?$/.exec(location.pathname)?.[1]?.toLowerCase() || null;
  const listeJetzt = () => /\/reels\/?$/.test(location.pathname) ? "reels" : pfadName() ? "beitraege" : null;
  const besitzerJe = {};   // Seitenname → Konto-ID des Seitenbesitzers (erste Seite, die auf dieser Adresse auftaucht)

  function story(o) {
    // Nur der Kopf des Beitrags zählt (Autor) – ein geteilter Seiten-Beitrag macht ein Nutzerprofil nicht zur Seite
    const kopf = o.comet_sections?.context_layout || o;
    const akteure = finde(kopf, x => Array.isArray(x.actors) && x.actors[0]?.id)?.actors || [];
    const akteur = akteure[0];
    const seite = !!finde(kopf, x => Array.isArray(x.actors) && x.actors.some(a => a?.delegate_page?.id));
    // Zahlen des Beitrags selbst: das feedback mit Reaktionen UND Shares (Kommentare haben eigene Reaktionen, aber keine Shares)
    const fb = finde(o, x => typeof x.reaction_count?.count === "number" && x.share_count) || finde(o, x => typeof x.reaction_count?.count === "number");
    const url = o.permalink_url || finde(o, x => typeof x.permalink_url === "string")?.permalink_url || "";
    const video = finde(o, x => x.__typename === "Video" && x.id);
    return {
      id: (video && /\/reel\//.test(url) ? video.id : null) || kennungAus(url) || String(o.post_id),
      url, zeit: o.creation_time, text: finde(o, x => x.__typename === "TextWithEntities" && typeof x.text === "string")?.text || "",
      reaktionen: fb?.reaction_count.count ?? null,
      shares: finde(o, x => typeof x.share_count?.count === "number")?.share_count.count ?? null,   // steht bei Facebook in einem eigenen Teil neben den Reaktionen
      kommentare: finde(o, x => x.comments && typeof x.comments.total_count === "number")?.comments.total_count ?? null,
      views: zahl(finde(o, x => x.view_count != null)?.view_count),
      bild: finde(o, x => x.photo_image?.uri)?.photo_image.uri || finde(o, x => x.preferred_thumbnail?.image?.uri)?.preferred_thumbnail.image.uri || "",
      fotoId: finde(o, x => x.__typename === "Photo" && x.id)?.id || null,   // Fotobeiträge: im Feed nur über den Fotolink erkennbar
      dauerMs: video?.playable_duration_in_ms ?? null, typ: /\/reel\//.test(url) ? "reel" : video ? "video" : "beitrag",
      besitzerId: akteur?.id || null, seite
    };
  }
  function reel(n) {
    const m = finde(n, x => x.__typename === "Video" && x.id && "play_count_reduced" in x) || finde(n, x => x.__typename === "Video" && x.id);
    if (!m) return null;
    return {
      id: String(m.id), url: m.permalink_url || `https://www.facebook.com/reel/${m.id}/`, zeit: m.created_time || n.creation_time,
      text: "", reaktionen: null, shares: null, kommentare: null, views: zahl(m.play_count_reduced),
      bild: m.preferred_thumbnail?.image?.uri || m.image?.uri || "", dauerMs: m.playable_duration_in_ms ?? null, typ: "reel",
      besitzerId: m.owner?.id || null, seite: !!m.owner?.delegate_page?.id
    };
  }

  function auswerten(j) {
    const name = pfadName(), liste = listeJetzt(), medien = [];
    (function lauf(o, tiefe) {
      if (!o || typeof o !== "object" || tiefe > 25) return;
      if (Array.isArray(o)) { for (const x of o) lauf(x, tiefe + 1); return; }
      if (o.profile_reel_node?.node) { const m = reel(o.profile_reel_node.node); if (m) medien.push(m); return; }
      if (o.__typename === "Story" && o.post_id && o.creation_time) { medien.push(story(o)); return; }
      for (const k in o) lauf(o[k], tiefe + 1);
    })(j, 0);
    const erlaubt = medien.filter(m => m.seite);   // Nutzerprofile: hier ist Schluss
    if (!erlaubt.length) return;
    // Liste nur für Beiträge des Seitenbesitzers dieser Adresse (keine geteilten oder vorgeschlagenen fremden Beiträge)
    if (name && liste) besitzerJe[name] ||= erlaubt[0].besitzerId;
    const raus = erlaubt.map(m => {
      let l = null;
      if (name && liste && m.besitzerId === besitzerJe[name]) l = liste === "reels" ? (m.typ === "reel" ? "reels" : null) : "beitraege";
      return { liste: l, m };
    });
    window.postMessage({ socialRadar: 1, quelle: "facebook", medien: raus, seite: name && besitzerJe[name] ? { name, id: besitzerJe[name] } : null }, location.origin);
  }

  function text(t, status) {
    if (status === 429) { window.postMessage({ socialRadar: 1, quelle: "facebook", gebremst: true }, location.origin); return; }
    if (!t) return;
    t.split("\n").forEach(z => { if (z[0] === "{") { try { auswerten(JSON.parse(z)); } catch { } } });
  }

  const f = window.fetch;
  window.fetch = async function (...a) {
    const r = await f.apply(this, a);
    try {
      const u = typeof a[0] === "string" ? a[0] : a[0]?.url;
      if (PASST.test(u || "")) r.clone().text().then(t => text(t, r.status), () => { });
    } catch { }
    return r;
  };
  const oeffnen = XMLHttpRequest.prototype.open, senden = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u, ...rest) { this.__socialRadarUrl = String(u); return oeffnen.call(this, m, u, ...rest); };
  XMLHttpRequest.prototype.send = function (...a) {
    if (PASST.test(this.__socialRadarUrl || "")) this.addEventListener("load", () => {
      try { if (this.responseType === "" || this.responseType === "text") text(this.responseText, this.status); } catch { }
    });
    return senden.apply(this, a);
  };
  // Erstes Laden: Facebook legt erste Beiträge als JSON in die Seite
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('script[type="application/json"]').forEach(s => {
      if (/creation_time|profile_reel_node/.test(s.textContent)) { try { auswerten(JSON.parse(s.textContent)); } catch { } }
    });
  });
})();
