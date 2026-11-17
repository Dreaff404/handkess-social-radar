// Social-Radar – Mitleser für Instagram (läuft im Seitenkontext, vor Instagrams eigenen Skripten).
// Liest nur die Antworten mit, die Instagram ohnehin lädt (Weg B, André 2026-11-03). Stellt keine eigenen Anfragen
// und schickt nichts weg – die gefundenen Zahlen gehen per postMessage an instagram.js im selben Tab.
// Stand des Aufbaus 2026-11: Profil = data.user (follower_count), Raster = …user_timeline_graphql_connection,
// Reels-Tab = …clips_connection (play_count, ohne taken_at), Einzelbeitrag = beliebiges Objekt mit code + pk.
(() => {
  const PASST = /\/(api\/graphql|graphql\/query|api\/v1\/)/;
  const UEBERSPRINGEN = /feed__timeline__connection|chaining|suggest|explore|reels_media|stories/;

  function knapp(o) {
    return {
      code: o.code, pk: String(o.pk), taken_at: o.taken_at ?? null, product_type: o.product_type ?? null, media_type: o.media_type ?? null,
      like_count: o.like_count ?? null, comment_count: o.comment_count ?? null,
      play_count: o.play_count ?? o.ig_play_count ?? null, view_count: o.view_count ?? o.video_view_count ?? null,
      versteckt: !!o.like_and_view_counts_disabled, video_duration: o.video_duration ?? null,
      text: o.caption?.text || "", bild: o.image_versions2?.candidates?.[0]?.url || o.display_uri || o.thumbnail_src || "",
      besitzer: o.user?.username || o.owner?.username || null
    };
  }

  function auswerten(j) {
    const medien = [], profile = [];
    (function lauf(o, liste, tiefe) {
      if (!o || typeof o !== "object" || tiefe > 14) return;
      if (Array.isArray(o)) { for (const x of o) lauf(x, liste, tiefe + 1); return; }
      if (typeof o.code === "string" && o.pk != null && ("like_count" in o || "play_count" in o || "comment_count" in o)) medien.push({ liste, m: knapp(o) });
      if (typeof o.username === "string" && typeof o.follower_count === "number")
        profile.push({ pk: String(o.pk ?? o.id ?? ""), username: o.username, follower: o.follower_count, name: o.full_name || "" });
      for (const k in o) {
        if (UEBERSPRINGEN.test(k)) continue;
        const l = /user_timeline/.test(k) ? "beitraege" : /clips/.test(k) ? "reels" : liste;
        lauf(o[k], l, tiefe + 1);
      }
    })(j, null, 0);
    if (medien.length || profile.length) window.postMessage({ socialRadar: 1, quelle: "instagram", medien, profile }, location.origin);
  }

  // Antworten können aus mehreren JSON-Zeilen bestehen
  function text(t, status) {
    if (status === 429) { window.postMessage({ socialRadar: 1, quelle: "instagram", gebremst: true }, location.origin); return; }
    if (!t || t[0] !== "{" && !t.startsWith("for (;;);")) return;
    t = t.replace(/^for \(;;\);/, "");
    try { auswerten(JSON.parse(t)); return; } catch { /* mehrzeilig */ }
    t.split("\n").forEach(z => { try { auswerten(JSON.parse(z)); } catch { } });
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
})();
