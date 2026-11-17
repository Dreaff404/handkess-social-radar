// Social-Radar – Kern: für alle Plattformen gleich (Kennzahlen, Filter, Sortierung, Hashtags, Marker).
// Kennt keine Plattform und keine Seite. Wird von background.js (importScripts) und vom Content Script geladen.
// Ein Video im gemeinsamen Format: { id, titel, url, bild, datum (ISO), views, likes, kommentare, dauerSek }
// likes/kommentare sind null, wenn die Plattform sie ausblendet.
const RadarKern = (() => {
  const TAG_MS = 86400000;

  // ISO-8601-Dauer von YouTube („PT1H2M3S“) in Sekunden
  function dauerSek(iso) {
    const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
    if (!m) return 0;
    return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
  }

  const tageSeit = (datum, jetzt = Date.now()) => Math.max(0, (jetzt - new Date(datum).getTime()) / TAG_MS);

  // Kennzahlen eines Videos, bezogen auf die Followerschaft des Kanals
  // ter = theoretische Engagement-Rate: (Likes + Kommentare) ÷ Follower × 100
  // reach = Reichweite: Views ÷ Follower × 100 (über 100 % = über die eigenen Follower hinaus)
  function kennzahlen(v, follower, jetzt = Date.now()) {
    const interaktionen = (v.likes || 0) + (v.kommentare || 0);
    const tage = tageSeit(v.datum, jetzt);
    return {
      ...v,
      tage,
      ter: follower > 0 ? interaktionen / follower * 100 : null,
      reach: follower > 0 && v.views != null ? v.views / follower * 100 : null,   // ohne öffentliche Views (Instagram-Bilder) kein Wert statt 0
      vpd: v.views != null ? v.views / Math.max(tage, 1) : null
    };
  }

  // Zeitraum in Tagen (0 = alle), optional nur Videos mit einem bestimmten Hashtag
  function filtern(videos, { zeitraum = 0, tag = null, tags = {} } = {}) {
    return videos.filter(v => (!zeitraum || v.tage <= zeitraum) && (!tag || (tags[v.id] || []).includes(tag)));
  }

  // feld: ter | reach | views | likes | kommentare | vpd | datum; richtung: beste | schlechteste
  // „beste“ beim Datum = neueste zuerst. Fehlende Werte (null) landen immer hinten.
  function sortieren(videos, feld, richtung = "beste") {
    const wert = v => feld === "datum" ? -v.tage : v[feld];
    const vorne = richtung === "beste" ? -1 : 1;
    return [...videos].sort((a, b) => {
      const x = wert(a), y = wert(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return x === y ? 0 : (x < y ? -vorne : vorne);
    });
  }

  const schnitt = (liste, f) => {
    const werte = liste.map(f).filter(w => w != null);
    return werte.length ? werte.reduce((s, w) => s + w, 0) / werte.length : null;
  };

  // Kanal gesamt über die gefilterten Videos
  function kanalSchnitt(videos, follower) {
    return {
      anzahl: videos.length,
      follower,
      views: schnitt(videos, v => v.views),
      reach: schnitt(videos, v => v.reach),
      ter: schnitt(videos, v => v.ter),
      vpd: schnitt(videos, v => v.vpd)
    };
  }

  const median = werte => {
    const w = werte.filter(x => x != null).sort((a, b) => a - b);
    if (!w.length) return null;
    const m = Math.floor(w.length / 2);
    return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
  };

  // Einordnung eines Videos (mit Kennzahlen) unter den Videos des Kanals im Zeitraum
  // platz/von: Rang nach theoretischer ER; terFaktor: ER ÷ Kanal-Schnitt; viewsFaktor: Views ÷ Median der Views
  function einordnung(v, kanalVideos, { zeitraum = 0 } = {}) {
    const liste = filtern(kanalVideos, { zeitraum });
    const mitVideo = liste.some(x => x.id === v.id) ? liste : [...liste, v];
    const rang = sortieren(mitVideo, "ter").findIndex(x => x.id === v.id);
    const sum = kanalSchnitt(liste, null);
    const med = median(liste.map(x => x.views));
    return {
      platz: rang + 1, von: mitVideo.length, imZeitraum: liste.some(x => x.id === v.id),
      terFaktor: v.ter != null && sum.ter ? v.ter / sum.ter : null,
      viewsFaktor: med ? v.views / med : null,
      likeQuote: v.likes != null && v.views ? v.likes / v.views * 100 : null,
      kommentarQuote: v.kommentare != null && v.views ? v.kommentare / v.views * 100 : null,
      dauerSchnitt: schnitt(liste, x => x.dauerSek || null)
    };
  }

  // ---------- Entwicklung über die Zeit (M5, 2026-11-05) ----------
  // Kalenderwoche nach ISO 8601, z. B. „2026-W45“ – ein Stand pro Profil und Woche
  function isoWoche(zeit = Date.now()) {
    const d = new Date(zeit); d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const jahr = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(jahr, 0, 1)) / TAG_MS + 1) / 7);
    return `${jahr}-W${String(w).padStart(2, "0")}`;
  }
  // Trend der Beiträge: Schnitt der letzten `tage` gegen die `tage` davor (nach Veröffentlichungsdatum)
  function trend(videos, feld = "ter", tage = 30, jetzt = Date.now()) {
    const fenster = (von, bis) => schnitt(videos.filter(v => { const t = tageSeit(v.datum, jetzt); return t >= von && t < bis; }), v => v[feld]);
    const neu = fenster(0, tage), alt = fenster(tage, 2 * tage);
    return { neu, alt, aenderung: neu != null && alt ? (neu - alt) / alt * 100 : null };
  }
  // Gleitender Durchschnitt: wöchentliche Punkte, je Punkt Schnitt der Beiträge der letzten `fenster` Tage
  function rollend(videos, feld = "ter", { fenster = 30, schritt = 7, jetzt = Date.now() } = {}) {
    const mit = videos.filter(v => v[feld] != null && v.datum);
    if (!mit.length) return [];
    const erstes = Math.min(...mit.map(v => new Date(v.datum).getTime()));   // ab dem ältesten Beitrag, sonst fiele der Anfang heraus
    const punkte = [];
    for (let t = jetzt; t >= Math.min(erstes, jetzt); t -= schritt * TAG_MS) {
      const im = mit.filter(v => { const d = new Date(v.datum).getTime(); return d <= t && d > t - fenster * TAG_MS; });
      if (im.length) punkte.unshift({ t, y: schnitt(im, v => v[feld]), n: im.length });
    }
    return punkte;
  }

  // ---------- Kanal-Score im Vergleich (M5, 2026-11-05) ----------
  // eintraege: [{ id, gruppe, werte: { ter, reach, trend, wachstum } }] – verglichen wird nur innerhalb derselben Gruppe
  // (Plattform + Bereich). Je Kennzahl: Anteil der Vergleichskanäle, die geschlagen werden (Gleichstand zählt halb).
  // Score = Schnitt dieser Anteile × 100. Unter `mindestens` Kanälen in der Gruppe: kein Score.
  const SCORE_FELDER = { ter: "Theoretische ER", reach: "Reichweite", trend: "Trend ER (30 T)", wachstum: "Follower-Wachstum" };
  function kanalScores(eintraege, { mindestens = 3 } = {}) {
    const gruppen = {};
    eintraege.forEach(e => (gruppen[e.gruppe] ||= []).push(e));
    const raus = {};
    for (const liste of Object.values(gruppen)) {
      for (const e of liste) {
        if (liste.length < mindestens) { raus[e.id] = { score: null, stufe: "offen", teile: {}, vergleich: liste.length - 1 }; continue; }
        const teile = {};
        for (const f of Object.keys(SCORE_FELDER)) {
          const mein = e.werte[f];
          const andere = liste.filter(x => x !== e && x.werte[f] != null).map(x => x.werte[f]);
          if (mein == null || andere.length < mindestens - 1) continue;
          teile[f] = (andere.filter(w => w < mein).length + andere.filter(w => w === mein).length / 2) / andere.length;
        }
        const anteile = Object.values(teile);
        const score = anteile.length ? Math.round(anteile.reduce((s, a) => s + a, 0) / anteile.length * 100) : null;
        raus[e.id] = { score, stufe: score == null ? "offen" : score >= 67 ? "gut" : score <= 33 ? "schwach" : "mittel", teile, vergleich: liste.length - 1 };
      }
    }
    return raus;
  }
  // Follower-Wachstum pro Woche in % aus Wochenständen/Markern (mind. 2 Punkte, mind. 6 Tage auseinander)
  function wachstumProWoche(punkte) {
    const p = punkte.filter(x => x.follower).sort((a, b) => a.zeit - b.zeit);
    if (p.length < 2) return null;
    const a = p[0], b = p[p.length - 1], wochen = (b.zeit - a.zeit) / (7 * TAG_MS);
    return wochen >= 6 / 7 ? ((b.follower / a.follower) ** (1 / wochen) - 1) * 100 : null;
  }

  // ---------- Views schätzen (v1.5, André 2026-11-13) ----------
  // Instagram-Bilder/Karussells und Facebook-Fotobeiträge haben keine öffentlichen Views. Geschätzt wird aus dem eigenen
  // Profil: Bei Beiträgen MIT Views (vor allem Reels) ist bekannt, wie viele Interaktionen (Likes + Kommentare) auf einen
  // View kommen. Views ≈ Interaktionen ÷ diese Quote. Spanne = 15.–85. Perzentil der Quoten (≈ 70 % der Fälle).
  // Format-Faktor: Feed-Beiträge werden vor allem Followern gezeigt und bekommen mehr Interaktionen pro View als Reels
  // (abgeleitet aus Branchenwerten: Reels ~2,25× Reichweite von Bildern, 1,36× von Karussells, ER je Follower ähnlich).
  // Der Faktor ist der ungeeichte Teil – Eichung am eigenen Kanal ist Stufe 3.
  const VIEW_FAKTOR = { reel: 1, video: 1.2, karussell: 1.4, bild: 1.5, beitrag: 1.5 };
  const quantil = (sortiert, p) => {
    const i = (sortiert.length - 1) * p, u = Math.floor(i), o = Math.ceil(i);
    return sortiert[u] + (sortiert[o] - sortiert[u]) * (i - u);
  };
  const interaktionen = v => (v.likes || 0) + (v.kommentare || 0);
  function viewModell(videos, { mindestens = 5, hoechstens = 40, unten = 0.15, oben = 0.85, faktoren = VIEW_FAKTOR } = {}) {
    const fak = v => faktoren[v.typ] ?? 1;
    const refs = videos
      .filter(v => v.views > 0 && v.likes != null && interaktionen(v) > 0 && v.datum)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum)).slice(0, hoechstens)   // jüngste zuerst: aktuelles Publikum
      .map(v => ({ id: v.id, views: v.views, i: interaktionen(v), q: interaktionen(v) / v.views / fak(v), f: fak(v) }));
    const spanne = (qs, i, f) => {
      const s = [...qs].sort((a, b) => a - b);
      return { von: i / (quantil(s, oben) * f), mitte: i / (quantil(s, 0.5) * f), bis: i / (quantil(s, unten) * f) };
    };
    if (refs.length < mindestens) return { genug: false, basis: refs.length, mindestens, schaetzen: () => null };
    const qs = refs.map(r => r.q);
    // Selbsttest: jedes Referenz-Video einmal weglassen, aus den übrigen schätzen, mit dem echten Wert vergleichen
    let treffer = 0; const fehler = [];
    if (refs.length > mindestens) refs.forEach((r, k) => {
      const sp = spanne(qs.filter((_, j) => j !== k), r.i, r.f);
      if (r.views >= sp.von && r.views <= sp.bis) treffer++;
      fehler.push(Math.abs(sp.mitte - r.views) / r.views * 100);
    });
    const selbsttest = fehler.length ? { treffer, von: refs.length, abweichung: median(fehler) } : null;
    return {
      genug: true, basis: refs.length, selbsttest,
      schaetzen(v) {
        if (v.views != null || v.likes == null || !interaktionen(v)) return null;
        return { ...spanne(qs, interaktionen(v), fak(v)), basis: refs.length, faktor: fak(v) };
      }
    };
  }
  // Modell aus allen Beiträgen lernen und jedem Beitrag ohne Views seine Schätzung anhängen (Views selbst bleiben null)
  function mitSchaetzung(videos, optionen) {
    const m = viewModell(videos, optionen);
    return { modell: m, videos: videos.map(v => { const s = m.schaetzen(v); return s ? { ...v, schaetzung: s } : v; }) };
  }

  // ---------- Portfolio-Analyse nach BCG (v1.6, André 2026-11-15) ----------
  // Je Plattform + Bereich: Stärke (wie gut steht ein Kanal heute da) und Dynamik (wie stark wächst er gerade).
  // Jede Kennzahl → Rang in der Gruppe (Anteil geschlagener Kanäle, Gleichstand halb), je Achse gewichtet, fehlende Werte
  // verteilen ihr Gewicht auf die übrigen. Stärke-Grenze = Gruppenmitte (50). Dynamik: Wer nicht wirklich wächst
  // (Views-Trend ≤ 0, ohne Views-Trend Follower-Wachstum ≤ 0), landet unter der Linie – auch wenn andere noch stärker schrumpfen.
  const PORTFOLIO = {
    staerke: { views: [0.5, "Ø Views"], ter: [0.3, "Theoretische ER"], reach: [0.2, "Reichweite"] },
    dynamik: { viewsTrend: [0.5, "Views-Trend (30 T)"], wachstum: [0.35, "Follower pro Woche"], terTrend: [0.15, "ER-Trend (30 T)"] }
  };
  const FELDER = { star: "Star", frage: "Question Mark", cash: "Cash Cow", dog: "Poor Dog", offen: "Zu wenig Daten" };
  function portfolio(eintraege, { mindestens = 4 } = {}) {
    if (eintraege.length < mindestens) return { genug: false, anzahl: eintraege.length, mindestens, kanaele: {} };
    const rang = (e, f) => {
      const mein = e.werte[f];
      const andere = eintraege.filter(x => x !== e && x.werte[f] != null).map(x => x.werte[f]);
      if (mein == null || andere.length < 2) return null;
      return (andere.filter(w => w < mein).length + andere.filter(w => w === mein).length / 2) / andere.length;
    };
    const achse = (e, teil) => {
      let summe = 0, gewicht = 0; const raenge = {};
      for (const [f, [g]] of Object.entries(PORTFOLIO[teil])) { const r = rang(e, f); raenge[f] = r; if (r != null) { summe += r * g; gewicht += g; } }
      return { wert: gewicht ? Math.round(summe / gewicht * 100) : null, raenge };
    };
    const kanaele = {};
    for (const e of eintraege) {
      const st = achse(e, "staerke"), dy = achse(e, "dynamik");
      const signal = e.werte.viewsTrend ?? e.werte.wachstum;
      const waechst = signal == null ? null : signal > 0;
      const gedeckelt = waechst === false && dy.wert != null && dy.wert >= 50;
      const dynamik = dy.wert == null ? null : gedeckelt ? 49 : dy.wert;
      const feld = st.wert == null || dynamik == null ? "offen" : dynamik >= 50 ? (st.wert >= 50 ? "star" : "frage") : (st.wert >= 50 ? "cash" : "dog");
      kanaele[e.id] = { staerke: st.wert, dynamik, feld, waechst, gedeckelt, raenge: { ...st.raenge, ...dy.raenge } };
    }
    return { genug: true, anzahl: eintraege.length, mindestens, kanaele };
  }

  // Hashtag vereinheitlichen: „Hook Frage“ → „#hook-frage“, „"#Talking Head"“ → „#talking-head“
  function tagNorm(text) {
    const s = String(text || "").trim().toLowerCase().replace(/["„“”'‚‘’]/g, "").replace(/^#+/, "").trim()
      .replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return s ? "#" + s : "";
  }

  // Eingabe kann mehrere Tags enthalten: „#a #b“ oder „a, b“. Ein einzelner Begriff mit Leerzeichen bleibt ein Tag.
  function tagsAusEingabe(text) {
    const s = String(text || "");
    const teile = s.includes(",") ? s.split(",") : ((s.match(/#/g) || []).length > 1 ? s.split(/\s+(?=#)/) : [s]);
    return [...new Set(teile.map(tagNorm).filter(Boolean))];
  }

  // Schnitt je Hashtag über die gefilterten Videos, beste theoretische ER zuerst
  function jeTag(videos, tags) {
    const gruppen = {};
    videos.forEach(v => (tags[v.id] || []).forEach(t => (gruppen[t] = gruppen[t] || []).push(v)));
    return Object.entries(gruppen)
      .map(([tag, liste]) => ({ tag, anzahl: liste.length, ter: schnitt(liste, v => v.ter), views: schnitt(liste, v => v.views) }))
      .sort((a, b) => (b.ter ?? -1) - (a.ter ?? -1));
  }

  // Marker: Stand eines Kanals zu einem Zeitpunkt
  function marker(follower, videos, jetzt = Date.now()) {
    return { zeit: jetzt, follower, views: Object.fromEntries(videos.map(v => [v.id, v.views])) };
  }

  // Veränderung seit einem Marker: Follower-Zuwachs und das Video mit dem größten Views-Zuwachs (absolut)
  function seitMarker(alt, follower, videos, jetzt = Date.now()) {
    if (!alt) return null;
    let top = null;
    videos.forEach(v => {
      const vorher = alt.views[v.id];
      if (vorher == null) return;
      const plus = v.views - vorher;
      if (!top || plus > top.plus) top = { id: v.id, titel: v.titel, plus, prozent: vorher > 0 ? plus / vorher * 100 : null };
    });
    const neu = videos.filter(v => alt.views[v.id] == null).length;
    return { tage: (jetzt - alt.zeit) / TAG_MS, followerPlus: follower - alt.follower, top, neu };
  }

  // Ampel für die theoretische ER: gut ab gruen, schwach unter rot (Werte in Prozent, einstellbar)
  const ampel = (ter, { gruen = 5, rot = 1 } = {}) => ter == null ? "leer" : ter >= gruen ? "gut" : ter < rot ? "schwach" : "mittel";

  // Anzeige auf Deutsch
  const zahl = n => n == null ? "–" : Math.round(n).toLocaleString("de-DE");
  const kurz = n => {
    if (n == null) return "–";
    if (n >= 1e6) return (Math.round(n / 1e5) / 10).toLocaleString("de-DE") + " Mio.";
    if (n >= 1e5) return Math.round(n / 1e3).toLocaleString("de-DE") + " Tsd.";
    if (n >= 1e4) return (Math.round(n / 100) / 10).toLocaleString("de-DE") + " Tsd.";   // 76.500 → „76,5 Tsd.“ wie bei der Plattform
    return zahl(n);
  };
  // Geschätzte Spanne: auf 2 Stellen gerundet, gleiche Einheit nur einmal – „12–20 Tsd.“
  const zweiStellen = n => { if (!n) return 0; const e = 10 ** (Math.floor(Math.log10(n)) - 1); return Math.round(n / e) * e; };
  const spanne = sch => {
    if (!sch) return "–";
    const a = kurz(zweiStellen(sch.von)), b = kurz(zweiStellen(sch.bis));
    if (a === b) return "~" + a;
    const ea = / (Tsd\.|Mio\.)$/.exec(a)?.[1], eb = / (Tsd\.|Mio\.)$/.exec(b)?.[1];
    return ea && ea === eb ? `${a.slice(0, -ea.length - 1)}–${b}` : `${a}–${b}`;
  };
  const faktor = n => n == null ? "–" : (Math.round(n * 10) / 10).toLocaleString("de-DE") + "×";
  const dauer = sek => sek == null ? "–" : `${Math.floor(sek / 60)}:${String(Math.round(sek % 60)).padStart(2, "0")}`;
  // Unter 1 % zwei Nachkommastellen (echte ER-Werte und Quoten liegen oft bei 0,3–0,8 %)
  const prozent = n => n == null ? "–" : n > 0 && n < 0.005 ? "< 0,01 %" : (n >= 100 ? Math.round(n) : n < 1 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10).toLocaleString("de-DE") + " %";

  return { dauerSek, tageSeit, kennzahlen, filtern, sortieren, kanalSchnitt, median, einordnung, isoWoche, trend, rollend, kanalScores, wachstumProWoche, SCORE_FELDER, VIEW_FAKTOR, viewModell, mitSchaetzung, PORTFOLIO, FELDER, portfolio, tagNorm, tagsAusEingabe, jeTag, marker, seitMarker, ampel, zahl, kurz, prozent, faktor, dauer, spanne };
})();
if (typeof module !== "undefined") module.exports = RadarKern;
