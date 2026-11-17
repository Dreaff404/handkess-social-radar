// Social-Radar – Mitleser für TikTok (läuft im Seitenkontext, vor TikToks eigenen Skripten).
// Liest nur mit, was TikTok ohnehin lädt – keine eigenen Anfragen, nichts verlässt den Browser. Funde gehen per postMessage an sammler.js.
// Stand des Aufbaus 2026-11: Profil-Videos = /api/post/item_list/ (itemList[] mit stats: playCount, diggCount, commentCount,
// shareCount, collectCount; createTime), Profil = userInfo (user.uniqueId, stats.followerCount) oder author + authorStats,
// beim ersten Laden steht beides im Skript #__UNIVERSAL_DATA_FOR_REHYDRATION__ (webapp.user-detail, webapp.video-detail).
(() => {
  const PASST = /\/api\//;
  const LISTE = u => /\/api\/post\/item_list/.test(u) ? "videos" : null;
  const UEBERSPRINGEN = /\/api\/(recommend|explore|prefetch|repost|related|user\/list|favorite|story|search)/;
  const zahl = (a, b) => b != null && b !== "" ? Number(b) : a != null ? Number(a) : null;

  function knapp(o) {
    const st = o.stats || {}, st2 = o.statsV2 || {};
    return {
      id: String(o.id), createTime: o.createTime ?? null, desc: o.desc || "",
      playCount: zahl(st.playCount, st2.playCount), diggCount: zahl(st.diggCount, st2.diggCount), commentCount: zahl(st.commentCount, st2.commentCount),
      shareCount: zahl(st.shareCount, st2.shareCount), collectCount: zahl(st.collectCount, st2.collectCount),
      duration: o.video?.duration ?? null, cover: o.video?.cover || o.video?.originCover || o.imagePost?.cover?.imageURL?.urlList?.[0] || "",
      autor: o.author?.uniqueId || null, foto: !!o.imagePost, angepinnt: !!o.isPinnedItem,
      hashtags: (o.textExtra || []).map(t => t.hashtagName).filter(Boolean)
    };
  }

  function auswerten(j, liste) {
    const medien = [], profile = [];
    (function lauf(o, tiefe) {
      if (!o || typeof o !== "object" || tiefe > 12) return;
      if (Array.isArray(o)) { for (const x of o) lauf(x, tiefe + 1); return; }
      if (o.id && o.createTime && (o.stats || o.statsV2) && o.author) {
        medien.push({ liste, m: knapp(o) });
        // Follower am Video sind bei TikTok gerundet (9700000) – nur als Notlösung, die genaue Zahl kommt aus dem Profil
        const f = o.authorStatsV2?.followerCount ?? o.authorStats?.followerCount;
        if (o.author.uniqueId && f != null) profile.push({ username: o.author.uniqueId, follower: Number(f), name: o.author.nickname || "", genau: false });
        return;
      }
      // Profil: statsV2 enthält die genaue Zahl (9697360), stats die gerundete (9700000)
      const f = o.statsV2?.followerCount ?? o.stats?.followerCount;
      if (o.user?.uniqueId && f != null) profile.push({ username: o.user.uniqueId, follower: Number(f), name: o.user.nickname || "", pk: o.user.id, genau: o.statsV2?.followerCount != null });
      for (const k in o) lauf(o[k], tiefe + 1);
    })(j, 0);
    if (medien.length || profile.length) window.postMessage({ socialRadar: 1, quelle: "tiktok", medien, profile }, location.origin);
  }

  function text(t, url, status) {
    if (status === 429) { window.postMessage({ socialRadar: 1, quelle: "tiktok", gebremst: true }, location.origin); return; }
    if (!t || t[0] !== "{") return;
    try { auswerten(JSON.parse(t), LISTE(url)); } catch { }
  }
  const pruefen = u => PASST.test(u || "") && !UEBERSPRINGEN.test(u || "");

  const f = window.fetch;
  window.fetch = async function (...a) {
    const r = await f.apply(this, a);
    try {
      const u = typeof a[0] === "string" ? a[0] : a[0]?.url;
      if (pruefen(u)) r.clone().text().then(t => text(t, u, r.status), () => { });
    } catch { }
    return r;
  };
  const oeffnen = XMLHttpRequest.prototype.open, senden = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u, ...rest) { this.__socialRadarUrl = String(u); return oeffnen.call(this, m, u, ...rest); };
  XMLHttpRequest.prototype.send = function (...a) {
    if (pruefen(this.__socialRadarUrl)) this.addEventListener("load", () => {
      try { if (this.responseType === "" || this.responseType === "text") text(this.responseText, this.__socialRadarUrl, this.status); } catch { }
    });
    return senden.apply(this, a);
  };

  // Erstes Laden: Profil und Einzelvideo stehen schon im Seitenquelltext
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const d = JSON.parse(document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__")?.textContent || "{}").__DEFAULT_SCOPE__ || {};
      if (d["webapp.user-detail"]?.userInfo) auswerten(d["webapp.user-detail"].userInfo, null);
      if (d["webapp.video-detail"]?.itemInfo?.itemStruct) auswerten(d["webapp.video-detail"].itemInfo.itemStruct, null);
    } catch { }
  });
})();
