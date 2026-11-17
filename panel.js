// Social-Radar – Panel (für alle Plattformen gleich; die Plattform kommt aus RadarPlattform = youtube.js oder instagram.js).
// Profil-/Kanalseite ausgeklappt: Kennzahlen, Sortierung, Hashtags, Marker und Rangliste; das Raster der Plattform ist dann ausgeblendet.
// Eingeklappt: nur die Kopfzeile, Raster normal – mit Platz und theoretischer ER als Overlay auf jedem Vorschaubild.
// Einzelnes Video / einzelner Beitrag („video“): Leiste mit Einordnung im Kanal bzw. Profil.
// Gespeichert (chrome.storage.local): ansicht, tags { id: ["#tag"] }, marker { "kanalId:bereich": [Marker] }, einstellungen,
// gespeichert { ordner: [{ id, name }], profile: { "plattform:kanalId": { plattform, kanalId, name, handle, ordner, seit, mein } }, zuletzt } – eigene Auswahl fürs Dashboard (M5),
// verlauf { "plattform:kanalId": [{ woche, zeit, follower, ter, views, anzahl }] } – höchstens ein Stand pro Woche, nur für gespeicherte Profile,
// entsteht beim Öffnen des Profils (kein Abruf im Hintergrund)
(() => {
  const P = RadarPlattform, K = RadarKern, B = P.begriffe;
  // Plattformen mit weiteren öffentlichen Zahlen (TikTok: Shares, Saves) hängen eigene Sortierungen an
  const SORTIERUNG = [["ter", "Theoretische ER"], ["reach", "Reichweite"], ["views", "Views"], ["likes", B.likes || "Likes"], ["kommentare", "Kommentare"], ...(P.extraSort || []), ["vpd", "Views pro Tag"], ["datum", "Datum"]];
  const ZEITRAUM = [[30, "30 Tage"], [60, "60 Tage"], [90, "90 Tage"], [365, "1 Jahr"], [0, "Alle"]];
  const KACHELN = { follower: B.follower, ter: "Theoretische ER", reach: "Reichweiten-Score", views: "Ø Views", vpd: "Ø Views pro Tag", anzahl: `${B.einheiten} im Zeitraum` };
  const ANSICHT = { eingeklappt: false, videoEingeklappt: false, sort: "ter", richtung: "beste", zeitraum: 90, kacheln: { follower: true, ter: true, reach: true, views: true, vpd: false, anzahl: true } };
  const SEITE_GROESSE = 24;

  let s = null;          // aktuelle Seite { schluessel, bereich, … } aus P.seite()
  let daten = null;      // { kanal, videos, bereich, geladenAm, gemischt }
  let videos = [];       // mit Kennzahlen
  let einzel = null;     // nur „video“: das Video/der Beitrag mit Kennzahlen; daten/videos sind dann Kanal bzw. Profil
  let zweit = null;      // nur YouTube-Übersicht: { daten, videos } der Shorts
  let viewModell = null;   // Views-Schätzung (v1.5): aus den Beiträgen des Profils mit Views gelernt
  let ansicht = structuredClone(ANSICHT), tags = {}, markerListe = {}, einst = { gruen: 5, rot: 1 };
  let gespeichert = { ordner: [], profile: {}, zuletzt: null };
  let filterTag = null, zeigen = SEITE_GROESSE, einstOffen = false, status = "", laedt = "", fokus = null;   // status = Fehler/Hinweis, laedt = Ladeanzeige
  let host = null, wurzel = null, beobachter = null, overlayTimer = 0, neuTimer = 0, lauf = 0;
  let nachladenRest = null;   // Instagram: Ergebnis von „Views nachladen“ (Anzahl Reels, die ohne Views blieben)

  // ---------- Speicher ----------
  const speichern = obj => { try { chrome.storage.local.set(obj); } catch { /* Erweiterung neu geladen */ } };
  async function laden() {
    const d = await chrome.storage.local.get(["ansicht", "tags", "marker", "einstellungen", "gespeichert"]);
    gespeichert = { ordner: [], profile: {}, zuletzt: null, ...d.gespeichert };
    ansicht = { ...structuredClone(ANSICHT), ...d.ansicht, kacheln: { ...ANSICHT.kacheln, ...d.ansicht?.kacheln } };
    tags = d.tags || {};
    markerListe = d.marker || {};
    einst = { gruen: 5, rot: 1, ...d.einstellungen };
  }
  chrome.storage.onChanged.addListener(c => {
    if (c.einstellungen) { einst = { gruen: 5, rot: 1, ...c.einstellungen.newValue }; zeichnen(); }
    if (c.schluessel && s) start(true);
    if (c.gespeichert) { gespeichert = { ordner: [], profile: {}, zuletzt: null, ...c.gespeichert.newValue }; zeichnen(); }
  });

  // ---------- Start und Navigation ----------
  P.beiNavigation(() => start());
  // Plattformen ohne Abruf (Instagram) melden neue mitgelesene Daten – dann leise neu rechnen
  P.beiNeuenDaten?.(() => { if (!s || !host) return; clearTimeout(neuTimer); neuTimer = setTimeout(() => abrufen(false, lauf, true), 600); });
  start();

  async function start(neu = false) {
    const nr = ++lauf;
    const naechste = P.seite();
    if (!naechste) { aufraeumen(); s = null; return; }
    if (!neu && s && naechste.schluessel === s.schluessel && host?.isConnected) return;
    if (!neu) aufraeumen();   // altes Panel, ausgeblendetes Raster und Overlays der vorigen Seite weg, bevor die neue gesucht wird
    s = naechste; daten = null; videos = []; zweit = null; einzel = null; filterTag = null; zeigen = SEITE_GROESSE; status = ""; laedt = "Lade Daten …";
    await laden();
    const anker = await warten(() => P.anker(s.bereich), 60000);   // manche Plattformen bauen den Inhalt erst spät auf
    if (nr !== lauf || !anker) return;
    einhaengen(anker);
    zeichnen();
    await abrufen(false, nr);
    const auftrag = P.auftrag?.(s);     // Instagram: „Views nachladen“ wurde im Beiträge-Tab angestoßen
    if (auftrag && nr === lauf) alleLaden(auftrag);
    else if (nr === lauf && s.bereich !== "beitraege") nachladenRest = null;
  }

  function warten(fn, ms) {
    return new Promise(fertig => {
      const ende = Date.now() + ms;
      (function pruefen() { const r = fn(); if (r || Date.now() > ende) fertig(r || null); else setTimeout(pruefen, 300); })();
    });
  }

  // leise = ohne Ladeanzeige (mitgelesene Daten, „Alle laden“ läuft)
  async function abrufen(neu, nr = lauf, leise = false) {
    if (!leise) { laedt = neu ? "Lade neu …" : "Lade Daten …"; zeichnen(); }
    const r = await P.laden(s, neu);
    if (nr !== lauf) return;
    laedt = "";
    if (!r) { status = "Keine Antwort von der Erweiterung. Seite neu laden."; zeichnen(); return; }
    if (r.ohneSchluessel) { status = "ohneSchluessel"; zeichnen(); return; }
    if (r.fehler) { status = r.fehler + (daten ? " Angezeigt wird der letzte Stand." : ""); zeichnen(); return; }
    status = r.hinweis || "";
    if (r.daten) {
      daten = r.daten;
      ({ videos, modell: viewModell } = K.mitSchaetzung(daten.videos.map(v => K.kennzahlen(v, daten.kanal.follower))));
    }
    zweit = r.zweit ? { daten: r.zweit, videos: r.zweit.videos.map(v => K.kennzahlen(v, r.zweit.kanal.follower)) } : null;
    einzel = r.einzel ? { ...K.kennzahlen(r.einzel, daten.kanal.follower), tags: r.einzel.tags || [] } : null;
    if (einzel && viewModell) { const sch = viewModell.schaetzen(einzel); if (sch) einzel.schaetzung = sch; }
    if (r.warten && !videos.length && !einzel) { laedt = r.hinweis; status = ""; daten = r.daten?.videos.length ? daten : null; }
    zeichnen();
    if (!istEinzel()) wochenstand();
  }

  // Wochenstand eines gespeicherten Profils: Follower und Schnitt der letzten 90 Tage, höchstens einmal pro Kalenderwoche
  async function wochenstand() {
    if (!daten || !istGespeichert() || !daten.kanal.follower || !videos.length) return;
    const sch = profilSchluessel(), woche = K.isoWoche();
    const { verlauf = {} } = await chrome.storage.local.get("verlauf");
    const liste = verlauf[sch] || [];
    if (liste.some(x => x.woche === woche)) return;
    const sum = K.kanalSchnitt(K.filtern(videos, { zeitraum: 90 }), daten.kanal.follower);
    verlauf[sch] = [...liste, { woche, zeit: Date.now(), follower: daten.kanal.follower, ter: sum.ter, views: sum.views, anzahl: sum.anzahl }].slice(-260);
    speichern({ verlauf });
  }

  // ---------- Einhängen ----------
  function einhaengen(anker) {
    if (!host) {
      host = document.createElement("div");
      host.id = "social-radar";
      host.style.setProperty("--bildformat", P.bildFormat || "16/9");
      wurzel = host.attachShadow({ mode: "open" });
      // Knöpfe reagieren beim Drücken: Das Panel zeichnet bei nachkommenden Daten neu, ein Klick (Drücken + Loslassen) ginge dann verloren.
      // Tastatur (Enter/Leertaste) löst nur „click“ ohne Mausdetail aus.
      wurzel.addEventListener("pointerdown", e => { if (e.button === 0) klick(e); });
      wurzel.addEventListener("click", e => { if (e.detail === 0) klick(e); });
      wurzel.addEventListener("change", aenderung);
      wurzel.addEventListener("keydown", taste);
      tastenAbschirmen(host);
      new MutationObserver(farben).observe(document.documentElement, { attributes: true, attributeFilter: [P.dunkelAttribut || "dark"] });
    }
    if (P.schwebend?.(s.bereich)) { host.setAttribute("data-schwebend", "ja"); if (host.parentElement !== anker) anker.appendChild(host); }
    else { host.removeAttribute("data-schwebend"); if (host.nextElementSibling !== anker) anker.parentElement.insertBefore(host, anker); }
    farben();
    beobachter?.disconnect();
    beobachter = new MutationObserver(() => { clearTimeout(overlayTimer); overlayTimer = setTimeout(() => { platzPruefen(); overlays(); }, 250); });
    const { ziel, art } = P.beobachtung(s.bereich);
    if (ziel) beobachter.observe(ziel, art);
  }

  // Steht das Panel nicht mehr direkt vor dem Raster (Raster kam später oder wurde neu gebaut), wieder davor setzen
  function platzPruefen() {
    if (!host || !s || P.schwebend?.(s.bereich)) return;
    const a = P.anker(s.bereich);
    if (a && a !== host && host.nextElementSibling !== a) a.parentElement.insertBefore(host, a);
    const r = P.raster();
    if (r && P.mitRaster(s.bereich) && !ansicht.eingeklappt && daten && !P.laeuft?.() && r.style.display !== "none") r.style.display = "none";
  }

  function aufraeumen() {
    beobachter?.disconnect();
    host?.remove();
    document.querySelectorAll(".social-radar-overlay").forEach(e => e.remove());
    const r = P.raster();
    if (r) r.style.removeProperty("display");
  }

  const farben = () => host && host.setAttribute("data-dunkel", P.dunkel() ? "ja" : "nein");

  // ---------- Berechnung ----------
  function sichtbar() {
    const gefiltert = K.filtern(videos, { zeitraum: ansicht.zeitraum, tag: filterTag, tags });
    return K.sortieren(gefiltert, ansicht.sort, ansicht.richtung);
  }
  const markerSchluessel = (d = daten) => d ? `${d.kanal.id}:${d.bereich}` : "";
  const istEinzel = () => s?.bereich === "video";

  // ---------- Zeichnen ----------
  const esc = t => String(t ?? "").replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));

  function zeichnen() {
    if (!wurzel) return;
    const r = P.raster();
    const liste = daten ? sichtbar() : [];
    const sum = daten ? K.kanalSchnitt(liste, daten.kanal.follower) : null;
    const zuSchluessel = istEinzel() ? "videoEingeklappt" : "eingeklappt";   // Einzelansicht klappt unabhängig vom Kanal-Panel
    const aufgeklappt = !ansicht[zuSchluessel];
    // Raster ausblenden, solange die Rangliste offen ist – nicht während „Alle laden“, sonst lädt die Plattform nichts nach
    if (r && P.mitRaster(s.bereich)) { if (aufgeklappt && daten && !P.laeuft?.()) r.style.display = "none"; else r.style.removeProperty("display"); }
    const ladeKnopf = P.alleLaden ? (P.laeuft() ? "Stopp" : B.ladeKnopf) : B.ladeKnopf;
    // Neuzeichnen darf eine angefangene Eingabe nicht löschen (Instagram liefert während des Tippens weiter Daten nach)
    const aktiv = wurzel.activeElement?.classList?.contains("tageingabe") ? wurzel.activeElement : null;
    const getippt = aktiv && !fokus ? { id: aktiv.dataset.video, wert: aktiv.value, von: aktiv.selectionStart, bis: aktiv.selectionEnd } : null;

    wurzel.innerHTML = `<style>${CSS}</style>
      <section class="panel ${aufgeklappt ? "" : "zu"}">
        <header>
          <button class="titel" data-aktion="klappen" aria-label="HandKess Social Radar ${aufgeklappt ? "einklappen" : "aufklappen"}" aria-expanded="${aufgeklappt}">
            <span class="pfeil">${aufgeklappt ? "▾" : "▸"}</span> ${HK_SYMBOL}<span class="hk" aria-label="HandKess"><span class="hk-hand">HAND</span><span class="hk-punkt"></span><span class="hk-kess">KESS</span></span><span class="hk-sub">Social Radar</span>
          </button>
          <span class="kopf-info">${kopfInfo(sum)}</span>
          <span class="knoepfe">
            ${daten && !istEinzel() ? `<button data-aktion="speichern" class="${istGespeichert() ? "gespeichert" : ""}" title="${istGespeichert() ? "Gespeichert – Ordner unten im Panel" : "Profil in deine Übersicht aufnehmen"}">${istGespeichert() ? "★ Gespeichert" : "☆ Speichern"}</button>` : ""}
            ${daten && !istEinzel() ? `<button data-aktion="marker">Marker setzen</button>` : ""}
            ${(daten || P.alleLaden) && !(istEinzel() && P.alleLaden) ? `<button data-aktion="neu" title="${P.alleLaden ? "Langsam scrollen, damit " + P.name + " alles nachlädt" : "Daten neu von " + P.name + " holen"}">${ladeKnopf}</button>` : ""}
            ${!istEinzel() ? `<button class="zahnrad" data-aktion="zahnrad" aria-label="Kennzahlen einstellen" title="Kennzahlen einstellen">⚙</button>` : ""}
          </span>
        </header>
        ${aufgeklappt ? koerper(liste, sum) : ""}
      </section>`;
    if (fokus) { const f = wurzel.querySelector(`input[data-video="${fokus}"]`); f?.focus(); fokus = null; }
    else if (getippt) {
      const f = wurzel.querySelector(`input[data-video="${getippt.id}"]`);
      if (f) { f.value = getippt.wert; f.focus(); f.setSelectionRange(getippt.von, getippt.bis); }
    }
    overlays();
  }

  function kopfInfo(sum) {
    if (status === "ohneSchluessel") return "Noch kein API-Schlüssel hinterlegt";
    if (!daten) return esc(laedt || status);
    if (laedt) return `${esc(daten.kanal.name)} · ${esc(laedt)}`;
    if (istEinzel() && einzel) {
      const e = K.einordnung(einzel, videos, { zeitraum: ansicht.zeitraum });
      return `${esc(daten.kanal.name)} · ${B.dieses} · Theoretische ER <b>${K.prozent(einzel.ter)}</b>${e.terFaktor != null ? ` (${K.faktor(e.terFaktor)} ${B.kanal}-Schnitt)` : ""}${videos.length ? ` · Platz <b>${e.platz}</b> von ${e.von}` : ""}`;
    }
    const alter = Math.round((Date.now() - daten.geladenAm) / 60000);
    const lauft = P.laeuft?.() ? ` · lädt nach … (${videos.length} ${B.einheiten})` : "";
    return `${esc(daten.kanal.name)} · ${P.bereichName[s.bereich]} · Theoretische ER${s.bereich === "uebersicht" ? " (Videos)" : ""} <b>${K.prozent(sum.ter)}</b> · Ø <b>${K.kurz(sum.views)}</b> Views · Stand ${alter < 1 ? "gerade eben" : alter < 60 ? `vor ${alter} Min.` : `vor ${Math.round(alter / 60)} Std.`}${lauft}`;
  }

  function koerper(liste, sum) {
    if (status === "ohneSchluessel") return `<div class="hinweis">HandKess Social Radar braucht deinen eigenen Schlüssel für die YouTube Data API. <button data-aktion="einstellungen">Einstellungen öffnen</button></div>`;
    if (!daten) return `<div class="hinweis${status ? " fehler" : ""}">${esc(status || laedt)}</div>`;
    const k = daten.kanal;
    const werte = kachelWerte(k, sum);
    const alleTags = [...new Set(videos.flatMap(v => tags[v.id] || []))].sort();
    const bekannte = [...new Set(Object.values(tags).flat())].sort();
    const proTag = K.jeTag(K.filtern(videos, { zeitraum: ansicht.zeitraum }), tags);
    return `
      ${status ? `<div class="hinweis${laedt ? "" : " fehler"}">${esc(status)}</div>` : ""}
      ${k.followerVersteckt ? `<div class="hinweis">Der ${B.kanal} blendet seine ${B.follower} aus – theoretische ER und Reichweite lassen sich nicht berechnen.</div>` : ""}
      ${daten.gemischt ? `<div class="hinweis">YouTube liefert für diesen Kanal keine getrennte Liste – Videos und Shorts sind gemischt.</div>` : ""}
      ${istEinzel() ? "" : ordnerZeile()}
      ${istEinzel() ? einzelLeiste(bekannte) : s.bereich === "uebersicht" ? uebersicht() : rangliste(liste, werte, alleTags, bekannte, proTag)}`;
  }

  // ---------- Profil speichern (eigene Übersicht im Dashboard) ----------
  const profilSchluessel = () => daten ? `${P.id}:${daten.kanal.id}` : "";
  const istGespeichert = () => !!gespeichert.profile[profilSchluessel()];
  function ordnerZeile() {
    const g = gespeichert.profile[profilSchluessel()];
    if (!g) return "";
    return `<div class="reihe ordner"><span class="lab">Ordner</span>
      <select data-ordner aria-label="Ordner für dieses Profil">
        <option value="" ${!g.ordner ? "selected" : ""}>Ohne Ordner</option>
        ${gespeichert.ordner.map(o => `<option value="${esc(o.id)}" ${g.ordner === o.id ? "selected" : ""}>${esc(o.name)}</option>`).join("")}
        <option value="__neu">+ Neuer Ordner …</option>
      </select>
      <button data-aktion="mein" class="${g.mein ? "gespeichert" : ""}" title="Dein eigener Kanal – im Dashboard oben und als Vergleich in jeder Zeile und jedem Graphen">${g.mein ? "★ Mein Kanal" : "Als „Mein Kanal“ markieren"}</button>
      <button data-aktion="dashboard">Übersicht öffnen</button>
      <button data-aktion="entfernen">Nicht mehr speichern</button></div>`;
  }
  function speichernMit(aenderung) {
    gespeichert = structuredClone(gespeichert);
    aenderung(gespeichert);
    speichern({ gespeichert });
    zeichnen();
  }
  function profilSpeichern() {
    const k = daten.kanal;
    speichernMit(g => {
      const ordner = g.ordner.some(o => o.id === g.zuletzt) ? g.zuletzt : null;   // zuletzt genutzter Ordner
      g.profile[profilSchluessel()] = { plattform: P.id, kanalId: k.id, name: k.name, handle: k.handle || "", ordner, seit: Date.now() };
    });
    wochenstand();   // erster Stand gleich beim Speichern
  }
  // „Mein Kanal“: je Plattform genau einer; erneuter Klick nimmt die Markierung weg
  function meinUmschalten() {
    speichernMit(g => {
      const ich = g.profile[profilSchluessel()];
      const an = !ich.mein;
      Object.values(g.profile).forEach(p => { if (p.plattform === P.id) delete p.mein; });
      if (an) ich.mein = true;
    });
  }
  function ordnerWaehlen(wert) {
    let id = wert || null;
    if (wert === "__neu") {
      const name = (prompt("Name des neuen Ordners:") || "").trim();
      if (!name) { zeichnen(); return; }
      id = "o" + Date.now().toString(36);
      speichernMit(g => { g.ordner.push({ id, name }); });
    }
    speichernMit(g => { if (g.profile[profilSchluessel()]) g.profile[profilSchluessel()].ordner = id; g.zuletzt = id; });
  }

  function einstZeile() {
    return einstOffen ? `<div class="einst">
        ${Object.entries(KACHELN).map(([id, name]) => `<label><input type="checkbox" data-kachel="${id}" ${ansicht.kacheln[id] ? "checked" : ""}> ${name}</label>`).join("")}
        <button data-aktion="dashboard">Vergleich aller Profile</button>
        <button data-aktion="einstellungen">Weitere Einstellungen</button>
      </div>` : "";
  }

  const kachelReihe = (werte, ohne = [], namen = {}) => `<div class="kacheln">${Object.keys(KACHELN).filter(id => ansicht.kacheln[id] && !ohne.includes(id)).map(id => `<div class="kachel"><div class="l">${namen[id] || KACHELN[id]}</div><div class="w">${werte[id]}</div></div>`).join("")}</div>`;
  const kachelWerte = (k, sum) => ({ follower: k.followerVersteckt ? "versteckt" : k.follower ? K.zahl(k.follower) : "–", ter: K.prozent(sum.ter), reach: K.prozent(sum.reach), views: K.zahl(sum.views), vpd: K.zahl(sum.vpd), anzahl: K.zahl(sum.anzahl) });

  // YouTube-Übersicht: Kanal allgemein – Videos und Shorts nebeneinander, ohne Rangliste
  function uebersicht() {
    const zeit = `<div class="reihe"><span class="lab">Zeitraum</span>${ZEITRAUM.map(([t, n]) => chip("zeitraum", t, n, ansicht.zeitraum === t)).join("")}</div>`;
    const block = (titel, d, vids, tab) => {
      const sum = K.kanalSchnitt(K.filtern(vids, { zeitraum: ansicht.zeitraum }), d.kanal.follower);
      return `<div class="block"><div class="block-kopf"><b>${titel}</b><button data-aktion="tab" data-wert="${tab}">Rangliste öffnen</button></div>
        ${kachelReihe(kachelWerte(d.kanal, sum), ["follower"], tab === "shorts" ? { anzahl: "Shorts im Zeitraum" } : {})}
        <div class="marker">${markerZeile(d, vids)}</div></div>`;
    };
    return `${einstZeile()}
      <div class="oben"><div class="kachel"><div class="l">${B.follower}</div><div class="w">${kachelWerte(daten.kanal, {}).follower}</div></div>${zeit}</div>
      ${block("Videos", daten, videos, "videos")}
      ${zweit ? block("Shorts", zweit.daten, zweit.videos, "shorts") : `<div class="leise zeile">Keine getrennten Shorts für diesen Kanal.</div>`}
      <div class="leise zeile">Sortierung, Hashtags und Rangliste findest du in den Tabs Videos und Shorts. Auf den Vorschaubildern hier steht die theoretische ER.</div>`;
  }

  // Einzelnes Video / einzelner Beitrag: Einordnung, Quoten, Hashtags, Tags des Creators
  function einzelLeiste(bekannte) {
    if (!einzel) return "";
    const v = einzel, e = K.einordnung(v, videos, { zeitraum: ansicht.zeitraum });
    const zr = ZEITRAUM.find(([t]) => t === ansicht.zeitraum)?.[1] || "";
    const kachel = (l, w, zusatz = "") => `<div class="kachel"><div class="l">${l}</div><div class="w">${w}</div>${zusatz ? `<div class="z">${zusatz}</div>` : ""}</div>`;
    const mitViews = v.views != null;
    return `
      <div class="kacheln">
        ${videos.length ? kachel(`Platz im ${B.kanal}`, `${e.platz} / ${e.von}`, `nach theoretischer ER · ${zr}${e.imZeitraum ? "" : ` · ${B.einheit} liegt außerhalb`}`) : ""}
        ${kachel("Theoretische ER", K.prozent(v.ter), e.terFaktor != null ? `${K.faktor(e.terFaktor)} ${B.kanal}-Schnitt` : "")}
        ${mitViews ? kachel("Reichweite", K.prozent(v.reach), `Views ÷ ${B.follower}`) : ""}
        ${mitViews ? kachel("Views", K.kurz(v.views), e.viewsFaktor != null ? `${K.faktor(e.viewsFaktor)} Median des ${B.kanal}s` : "") : kachel(B.likes || "Likes", K.kurz(v.likes), "keine öffentlichen Views")}
        ${!mitViews && v.schaetzung ? kachel("Views (geschätzt)", `<span class="geschaetzt">${K.spanne(v.schaetzung)}</span>`, schaetzHinweis()) : ""}
        ${mitViews ? kachel("Views pro Tag", K.zahl(v.vpd), `seit Upload vor ${K.zahl(v.tage)} ${Math.round(v.tage) === 1 ? "Tag" : "Tagen"}`) : kachel("Alter", `${K.zahl(v.tage)} ${Math.round(v.tage) === 1 ? "Tag" : "Tage"}`, "seit Veröffentlichung")}
        ${mitViews ? kachel(`${B.likeQuote || "Like-Quote"}`, K.prozent(e.likeQuote), `${K.kurz(v.likes)} ${B.likes || "Likes"} ÷ Views`) : ""}
        ${mitViews ? kachel("Kommentar-Quote", K.prozent(e.kommentarQuote), `${K.kurz(v.kommentare)} Kommentare ÷ Views`) : kachel("Kommentare", K.kurz(v.kommentare))}
        ${v.shares != null ? kachel("Shares", K.kurz(v.shares), v.views ? `${K.prozent(v.shares / v.views * 100)} der Views` : "") : ""}
        ${v.saves != null ? kachel("Saves", K.kurz(v.saves), v.views ? `${K.prozent(v.saves / v.views * 100)} der Views` : "") : ""}
        ${v.dauerSek ? kachel("Dauer", K.dauer(v.dauerSek), e.dauerSchnitt ? `${B.kanal}-Schnitt ${K.dauer(e.dauerSchnitt)}` : "") : ""}
      </div>
      <div class="reihe"><span class="lab">Vergleich</span>${ZEITRAUM.map(([t, n]) => chip("zeitraum", t, n, ansicht.zeitraum === t)).join("")}
        ${daten.kanal.handle || daten.kanal.id ? `<button data-aktion="tab" data-wert="${esc(P.ranglistePfad(daten))}">${B.kanal}-Rangliste öffnen</button>` : ""}</div>
      <div class="reihe"><span class="lab">Formate</span>
        <span class="tags">${(tags[v.id] || []).map(t => `<button class="tag" data-aktion="tagWeg" data-video="${v.id}" data-wert="${esc(t)}" title="Entfernen">${esc(t)} ×</button>`).join("")}</span>
        <input class="tageingabe schmal" list="radar-tags" data-video="${v.id}" placeholder="#format + Enter" aria-label="Hashtag für diesen ${B.einheit}"></div>
      <datalist id="radar-tags">${bekannte.map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <div class="reihe"><span class="lab">${B.tagsCreator}</span>${v.tags.length ? `<span class="yt-tags">${v.tags.map(t => `<span class="yt-tag">${esc(t)}</span>`).join("")}</span>` : `<span class="leise">${B.keineTags}</span>`}</div>`;
  }

  function rangliste(liste, werte, alleTags, bekannte, proTag) {
    const fehlend = s.bereich === "beitraege" && P.ohneViews ? P.ohneViews(daten).length : 0;
    return `${einstZeile()}
      ${fehlend && nachladenRest == null ? `<div class="hinweis">${fehlend} Reels ohne Views – ${P.name} zeigt Views nur im Reels-Tab. <button data-aktion="viewsNachladen">Views nachladen</button></div>` : ""}
      ${nachladenRest != null ? `<div class="hinweis">${nachladenRest ? `${nachladenRest} Reels blieben ohne Views – sie stehen nicht im Reels-Tab (z. B. Kooperationen anderer Konten).` : "Views nachgeladen."}</div>` : ""}
      ${kachelReihe(werte)}
      ${schaetzZeile()}
      <div class="marker">${markerZeile(daten, videos)}</div>
      <div class="reihe"><span class="lab">Sortieren</span>${SORTIERUNG.map(([id, n]) => chip("sort", id, n, ansicht.sort === id)).join("")}</div>
      <div class="reihe"><span class="lab">Richtung</span>${chip("richtung", "beste", "Beste", ansicht.richtung === "beste")}${chip("richtung", "schlechteste", "Schlechteste", ansicht.richtung === "schlechteste")}
        <span class="lab abstand">Zeitraum</span>${ZEITRAUM.map(([t, n]) => chip("zeitraum", t, n, ansicht.zeitraum === t)).join("")}</div>
      <div class="reihe"><span class="lab">Formate</span>${chip("tag", "", "Alle", !filterTag)}${alleTags.map(t => chip("tag", t, t, filterTag === t)).join("") || `<span class="leise">Noch keine Hashtags – trag sie unter den ${B.einheiten} ein.</span>`}</div>
      ${proTag.length ? `<div class="leise zeile">Theoretische ER je Format: ${proTag.map(t => `${esc(t.tag)} <b>${K.prozent(t.ter)}</b> (${t.anzahl})`).join(" · ")}</div>` : ""}
      <datalist id="radar-tags">${bekannte.map(t => `<option value="${esc(t)}">`).join("")}</datalist>
      <div class="raster">${liste.slice(0, zeigen).map((v, i) => karte(v, i)).join("") || `<div class="leise">Keine ${B.einheiten} in diesem Zeitraum${filterTag ? " mit " + esc(filterTag) : ""}.</div>`}</div>
      ${liste.length > zeigen ? `<div class="mehr"><button data-aktion="mehr">Mehr anzeigen (${liste.length - zeigen} weitere)</button></div>` : ""}`;
  }

  // Views-Schätzung: woraus geschätzt und wie gut der Selbsttest an den Beiträgen mit echten Views lief
  const dativ = w => /e$/.test(w) ? w + "n" : w;   // „aus 12 Beiträgen“, „aus 12 Videos“
  function schaetzHinweis() {
    const m = viewModell;
    if (!m?.genug) return "";
    const t = m.selbsttest;
    return `aus ${m.basis} ${dativ(B.einheiten)} mit Views${t ? ` · Selbsttest: ${t.treffer} von ${t.von} in der Spanne` : ""}`;
  }
  function schaetzZeile() {
    const ohne = videos.filter(v => v.views == null && v.likes != null).length;
    if (!ohne || !viewModell) return "";
    if (!viewModell.genug) return `<div class="leise zeile">Views-Schätzung: zu wenige ${B.einheiten} mit Views (${viewModell.basis} von mind. ${viewModell.mindestens})${P.ohneViews ? " – „Views nachladen“ oder „Alle laden“ hilft" : ""}.</div>`;
    const t = viewModell.selbsttest;
    return `<div class="leise zeile schaetz-zeile" title="Views ≈ (Likes + Kommentare) ÷ Interaktionen pro View dieses Profils, mit Format-Faktor für Bilder und Karussells. Geschätzte Werte zählen nicht in Ø Views, Reichweite, Sortierung oder Score.">
      Views geschätzt für ${videos.filter(v => v.schaetzung).length} ${B.einheiten} ohne öffentliche Views – gelernt aus ${viewModell.basis} ${dativ(B.einheiten)} mit Views.
      ${t ? `Selbsttest: echter Wert lag bei <b>${t.treffer} von ${t.von}</b> in der Spanne, Mitte im Schnitt ±${K.zahl(t.abweichung)} % daneben.` : ""}
      Zählt nicht in Ø Views und Reichweite.</div>`;
  }

  const chip = (art, wert, name, an) => `<button class="chip ${an ? "an" : ""}" data-aktion="${art}" data-wert="${esc(wert)}">${esc(name)}</button>`;

  function karte(v, i) {
    const a = K.ampel(v.ter, einst);
    return `<article class="karte">
      <a class="bild" href="${esc(v.url)}">${v.bild ? `<img src="${esc(v.bild)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
        <span class="platz">#${i + 1}</span><span class="er ${a}">ER ${K.prozent(v.ter)}</span></a>
      <div class="info">
        <a class="vtitel" href="${esc(v.url)}">${esc(v.titel)}</a>
        <div class="kv"><span>Theoretische ER</span><b>${K.prozent(v.ter)}</b></div>
        <div class="kv"><span>Reichweite (Views ÷ ${B.folgerKurz})</span><b>${K.prozent(v.reach)}</b></div>
        <div class="kv"><span>${v.views != null ? K.zahl(v.views) + " Views" : v.schaetzung ? `<span class="geschaetzt" title="Geschätzt aus Likes und Kommentaren – ${esc(schaetzHinweis())}">${K.spanne(v.schaetzung)} Views (geschätzt)</span>` : "keine Views"}</span><span>vor ${K.zahl(v.tage)} ${Math.round(v.tage) === 1 ? "Tag" : "Tagen"}</span></div>
        <div class="kv"><span>${K.kurz(v.likes)} ${B.likes || "Likes"}</span><span>${K.kurz(v.kommentare)} Kommentare</span></div>
        ${v.shares != null || v.saves != null ? `<div class="kv"><span>${K.kurz(v.shares)} Shares</span><span>${v.saves != null ? K.kurz(v.saves) + " Saves" : ""}</span></div>` : ""}
        <div class="tags">${(tags[v.id] || []).map(t => `<button class="tag" data-aktion="tagWeg" data-video="${v.id}" data-wert="${esc(t)}" title="Entfernen">${esc(t)} ×</button>`).join("")}</div>
        <input class="tageingabe" list="radar-tags" data-video="${v.id}" placeholder="#format + Enter" aria-label="Hashtag für diesen ${B.einheit}">
      </div></article>`;
  }

  function markerZeile(d, vids) {
    const liste = markerListe[markerSchluessel(d)] || [];
    if (!liste.length) return `<span class="leise">Noch kein Marker. Setz einen, um beim nächsten Besuch die Entwicklung zu sehen.</span>`;
    const letzter = liste[liste.length - 1];
    const dif = K.seitMarker(letzter, d.kanal.follower, vids);
    const datum = new Date(letzter.zeit).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const plus = n => `<span class="${n > 0 ? "plus" : n < 0 ? "minus" : ""}">${n > 0 ? "+" : ""}${K.zahl(n)}</span>`;
    const top = dif.top && dif.top.plus > 0 ? ` · stärkster Zuwachs: „${esc(dif.top.titel)}“ ${plus(dif.top.plus)} Views${dif.top.prozent != null ? ` (${K.prozent(dif.top.prozent)})` : ""}` : "";
    return `Seit Marker vom ${datum} (vor ${K.zahl(dif.tage)} T): ${plus(dif.followerPlus)} ${B.follower}${top}${dif.neu ? ` · ${dif.neu} neue ${B.einheiten}` : ""}`;
  }

  // ---------- Overlays auf dem Raster der Plattform ----------
  function overlays() {
    if (!daten || istEinzel()) return;
    const ueb = s.bereich === "uebersicht";
    const rang = ueb ? new Map() : new Map(sichtbar().map((v, i) => [v.id, [i + 1, v]]));
    const alle = new Map([...videos, ...(zweit?.videos || [])].map(v => [v.id, v]));
    (ueb ? P.vorschaubilder() : P.kacheln()).forEach(({ id, bild }) => {
      let o = bild.querySelector(":scope > .social-radar-overlay");
      const treffer = rang.get(id), v = treffer?.[1] || alle.get(id);
      if (!v) { o?.remove(); return; }
      if (getComputedStyle(bild).position === "static") bild.style.position = "relative";
      if (!o) { o = document.createElement("div"); o.className = "social-radar-overlay"; bild.appendChild(o); }
      const a = K.ampel(v.ter, einst);
      const farbe = { gut: "#0f7b3f", mittel: "rgba(0,0,0,.78)", schwach: "#b3261e", leer: "rgba(0,0,0,.78)" }[a];
      o.setAttribute("style", `position:absolute;top:6px;left:6px;z-index:5;display:flex;gap:4px;pointer-events:none;font:500 12px/1 Roboto,Arial,sans-serif`);
      o.innerHTML = `${treffer ? `<span style="background:rgba(0,0,0,.78);color:#fff;padding:4px 6px;border-radius:4px">#${treffer[0]}</span>` : ""}<span style="background:${farbe};color:#fff;padding:4px 6px;border-radius:4px">ER ${K.prozent(v.ter)}</span>`;
    });
  }

  // ---------- Bedienung ----------
  function klick(e) {
    const b = e.target.closest("[data-aktion]");
    if (!b) return;
    const w = b.dataset.wert;
    switch (b.dataset.aktion) {
      case "klappen": { const k = istEinzel() ? "videoEingeklappt" : "eingeklappt"; ansicht[k] = !ansicht[k]; } speichern({ ansicht }); break;
      case "zahnrad": if (ansicht.eingeklappt) { ansicht.eingeklappt = false; speichern({ ansicht }); } einstOffen = !einstOffen; break;
      case "einstellungen": try { chrome.runtime.sendMessage({ typ: "einstellungen" }); } catch { } return;
      case "dashboard": try { chrome.runtime.sendMessage({ typ: "dashboard" }); } catch { } return;
      case "neu": if (P.alleLaden) { alleLaden(); return; } abrufen(true); return;
      case "viewsNachladen": P.viewsNachladen(daten.kanal.handle.toLowerCase()); return;
      case "marker": markerSetzen(); break;
      case "speichern": if (istGespeichert()) { if (ansicht.eingeklappt) { ansicht.eingeklappt = false; speichern({ ansicht }); } } else profilSpeichern(); break;
      case "entfernen": speichernMit(g => { delete g.profile[profilSchluessel()]; }); return;
      case "mein": meinUmschalten(); return;
      case "mehr": zeigen += SEITE_GROESSE; break;
      case "tab": location.href = w.startsWith("/") ? w : s.basis + "/" + w; return;
      case "sort": ansicht.sort = w; zeigen = SEITE_GROESSE; speichern({ ansicht }); break;
      case "richtung": ansicht.richtung = w; zeigen = SEITE_GROESSE; speichern({ ansicht }); break;
      case "zeitraum": ansicht.zeitraum = +w; zeigen = SEITE_GROESSE; speichern({ ansicht }); break;
      case "tag": filterTag = w || null; zeigen = SEITE_GROESSE; break;
      case "tagWeg": {
        const id = b.dataset.video;
        tags[id] = (tags[id] || []).filter(t => t !== w);
        if (!tags[id].length) delete tags[id];
        if (filterTag === w && !Object.values(tags).some(l => l.includes(w))) filterTag = null;
        speichern({ tags }); break;
      }
      default: return;
    }
    zeichnen();
  }

  // Instagram: „Alle laden“ scrollt langsam, das Raster bleibt dabei sichtbar; zweiter Klick = Stopp
  async function alleLaden(auftrag = null) {
    if (P.laeuft()) { P.alleLaden(); return; }
    const nr = lauf;
    if (auftrag) { status = auftrag.text; zeichnen(); }
    const fertig = P.alleLaden(() => { if (nr === lauf) abrufen(false, nr, true); }, { fertigWenn: auftrag?.fertigWenn });
    zeichnen();
    const r = await fertig;
    if (nr !== lauf || !r) return;
    await abrufen(false, nr, true);
    if (r.grund === "gebremst") status = `${P.name} bremst gerade – „Alle laden“ angehalten. Später weitermachen.`;
    if (auftrag && r.grund !== "gestoppt") { nachladenRest = auftrag.danach(); return; }
    window.scrollTo({ top: host.getBoundingClientRect().top + scrollY - 80 });
    zeichnen();
  }

  function aenderung(e) {
    if (e.target.hasAttribute("data-ordner")) { ordnerWaehlen(e.target.value); return; }
    const k = e.target.dataset.kachel;
    if (!k) return;
    ansicht.kacheln[k] = e.target.checked;
    speichern({ ansicht }); zeichnen();
  }

  function taste(e) {
    const f = e.target;
    if (e.key !== "Enter" || !f.classList?.contains("tageingabe")) return;
    e.preventDefault();
    const neu = K.tagsAusEingabe(f.value);
    if (!neu.length) return;
    const id = f.dataset.video;
    tags[id] = [...new Set([...(tags[id] || []), ...neu])];
    speichern({ tags });
    fokus = id;
    zeichnen();
  }

  // Auf der YouTube-Übersicht gilt der Marker für Videos und Shorts gleichzeitig
  function markerSetzen() {
    const paare = [[daten, videos], ...(s.bereich === "uebersicht" && zweit ? [[zweit.daten, zweit.videos]] : [])];
    paare.forEach(([d, vids]) => {
      const sch = markerSchluessel(d);
      markerListe[sch] = [...(markerListe[sch] || []), K.marker(d.kanal.follower, vids)].slice(-20);
    });
    speichern({ marker: markerListe });
  }

  // Plattformen fangen Tastendrücke global ab (YouTube: „k“ = Pause, „/“ = Suche). Was im Panel getippt wird, bleibt im Panel.
  function tastenAbschirmen(el) { ["keydown", "keypress", "keyup"].forEach(t => el.addEventListener(t, e => e.stopPropagation())); }

  // HandKess-Symbol „Kümmel-Stern“ (André 2026-11-13, Variante 1), inline wegen der Shadow-DOM-Kapselung
  const HK_SYMBOL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" class="hk-symbol" aria-hidden="true"><rect width="128" height="128" rx="26" fill="#0B0B0B"/><path d="M108.5 72.3 L90.5 101.3 L67.1 112.1 L20.0 91.8 L17.7 60.9 L31.5 51.5 L27.0 35.0 L47.7 21.7 L82.2 13.9 L114.5 50.9Z" fill="#CDDE30"/><g transform="translate(65 63) scale(.84) translate(-64 -64)"><path d="M66.0 59.6 L66.1 59.3 L66.3 58.9 L66.4 58.6 L66.6 58.3 L66.7 57.9 L66.9 57.6 L67.0 57.3 L67.1 57.0 L67.3 56.6 L67.4 56.3 L67.6 56.0 L67.7 55.7 L67.9 55.3 L68.0 55.0 L68.1 54.7 L68.3 54.4 L68.4 54.0 L68.6 53.7 L68.7 53.4 L68.8 53.1 L69.0 52.7 L69.1 52.4 L69.2 52.1 L69.4 51.7 L69.5 51.4 L69.6 51.1 L69.7 50.7 L69.9 50.4 L70.0 50.1 L70.1 49.8 L70.2 49.4 L70.4 49.1 L70.5 48.7 L70.6 48.4 L70.7 48.1 L70.8 47.7 L70.9 47.4 L71.0 47.1 L71.1 46.7 L71.2 46.4 L71.3 46.0 L71.4 45.7 L71.5 45.3 L71.6 45.0 L71.7 44.7 L71.8 44.3 L71.9 44.0 L72.0 43.6 L72.1 43.3 L72.2 42.9 L72.3 42.6 L72.4 42.2 L72.5 41.9 L72.5 41.5 L72.6 41.2 L72.7 40.8 L72.8 40.5 L72.9 40.1 L73.0 39.8 L73.1 39.4 L73.2 39.1 L73.3 38.7 L73.4 38.3 L73.5 38.0 L73.6 37.6 L73.7 37.3 L73.8 36.9 L73.9 36.5 L74.0 36.2 L74.1 35.8 L74.2 35.4 L74.3 35.1 L74.4 34.7 L74.5 34.3 L74.6 34.0 L74.7 33.6 L74.8 33.2 L74.9 32.8 L75.0 32.5 L75.1 32.1 L75.2 31.7 L75.3 31.3 L75.4 30.9 L75.4 30.6 L75.5 30.2 L75.6 29.8 L75.7 29.4 L75.8 29.0 L75.8 28.6 L75.9 28.2 L63.0 29.4 L63.1 29.7 L63.2 30.0 L63.4 30.3 L63.5 30.6 L63.6 31.0 L63.8 31.3 L63.9 31.6 L64.0 31.9 L64.2 32.2 L64.3 32.5 L64.4 32.8 L64.5 33.1 L64.7 33.5 L64.8 33.8 L64.9 34.1 L65.0 34.4 L65.1 34.7 L65.2 35.0 L65.3 35.4 L65.4 35.7 L65.5 36.0 L65.6 36.3 L65.6 36.6 L65.7 37.0 L65.8 37.3 L65.9 37.6 L65.9 37.9 L66.0 38.3 L66.0 38.6 L66.1 38.9 L66.1 39.2 L66.1 39.6 L66.2 39.9 L66.2 40.2 L66.2 40.5 L66.3 40.9 L66.3 41.2 L66.3 41.5 L66.3 41.9 L66.3 42.2 L66.3 42.5 L66.3 42.8 L66.3 43.2 L66.3 43.5 L66.3 43.8 L66.3 44.1 L66.3 44.5 L66.2 44.8 L66.2 45.1 L66.2 45.4 L66.2 45.8 L66.2 46.1 L66.1 46.4 L66.1 46.8 L66.1 47.1 L66.1 47.4 L66.0 47.7 L66.0 48.1 L66.0 48.4 L65.9 48.7 L65.9 49.1 L65.8 49.4 L65.8 49.7 L65.7 50.1 L65.7 50.4 L65.6 50.7 L65.6 51.0 L65.5 51.4 L65.5 51.7 L65.4 52.0 L65.4 52.4 L65.3 52.7 L65.2 53.0 L65.1 53.3 L65.1 53.7 L65.0 54.0 L64.9 54.3 L64.8 54.7 L64.7 55.0 L64.6 55.3 L64.6 55.6 L64.5 56.0 L64.4 56.3 L64.2 56.6 L64.1 56.9 L64.0 57.3 L63.9 57.6 L63.8 57.9 L63.7 58.2 L63.5 58.5Z" fill="#0B0B0B"/><circle cx="64.8" cy="59.1" r="1.3" fill="#0B0B0B"/><circle cx="69.4" cy="28.8" r="6.5" fill="#0B0B0B"/><path d="M68.9 63.0 L69.2 62.9 L69.5 62.7 L69.9 62.6 L70.2 62.5 L70.5 62.4 L70.9 62.3 L71.2 62.2 L71.5 62.1 L71.9 61.9 L72.2 61.8 L72.5 61.7 L72.9 61.6 L73.2 61.5 L73.5 61.4 L73.9 61.2 L74.2 61.1 L74.5 61.0 L74.9 60.9 L75.2 60.8 L75.5 60.6 L75.8 60.5 L76.2 60.4 L76.5 60.3 L76.8 60.2 L77.2 60.0 L77.5 59.9 L77.8 59.8 L78.1 59.7 L78.5 59.5 L78.8 59.4 L79.1 59.3 L79.5 59.2 L79.8 59.0 L80.1 58.9 L80.5 58.8 L80.8 58.7 L81.1 58.6 L81.4 58.4 L81.8 58.3 L82.1 58.2 L82.5 58.1 L82.8 58.0 L83.1 57.9 L83.5 57.7 L83.8 57.6 L84.1 57.5 L84.5 57.4 L84.8 57.3 L85.2 57.2 L85.5 57.1 L85.9 57.0 L86.2 56.8 L86.5 56.7 L86.9 56.6 L87.2 56.5 L87.6 56.4 L87.9 56.3 L88.3 56.2 L88.6 56.1 L89.0 56.0 L89.3 55.9 L89.7 55.7 L90.0 55.6 L90.4 55.5 L90.7 55.4 L91.1 55.3 L91.4 55.2 L91.8 55.0 L92.1 54.9 L92.5 54.8 L92.8 54.7 L93.2 54.5 L93.5 54.4 L93.9 54.3 L94.2 54.1 L94.6 54.0 L94.9 53.8 L95.2 53.7 L95.6 53.5 L95.9 53.4 L96.3 53.2 L96.6 53.1 L96.9 52.9 L97.3 52.8 L97.6 52.6 L97.9 52.4 L98.3 52.3 L98.6 52.1 L98.9 51.9 L99.3 51.8 L91.7 41.9 L91.5 42.1 L91.3 42.4 L91.1 42.6 L90.8 42.9 L90.6 43.1 L90.4 43.4 L90.2 43.6 L89.9 43.9 L89.7 44.1 L89.5 44.3 L89.3 44.6 L89.0 44.8 L88.8 45.1 L88.6 45.3 L88.4 45.6 L88.1 45.8 L87.9 46.1 L87.7 46.3 L87.5 46.6 L87.2 46.8 L87.0 47.1 L86.8 47.3 L86.5 47.6 L86.3 47.9 L86.1 48.1 L85.9 48.4 L85.6 48.6 L85.4 48.9 L85.2 49.1 L84.9 49.4 L84.7 49.6 L84.5 49.9 L84.2 50.1 L84.0 50.4 L83.7 50.6 L83.5 50.8 L83.3 51.1 L83.0 51.3 L82.8 51.5 L82.5 51.8 L82.2 52.0 L82.0 52.2 L81.7 52.4 L81.5 52.7 L81.2 52.9 L80.9 53.1 L80.7 53.3 L80.4 53.5 L80.1 53.7 L79.9 53.9 L79.6 54.1 L79.3 54.3 L79.0 54.5 L78.8 54.7 L78.5 54.9 L78.2 55.1 L77.9 55.2 L77.6 55.4 L77.3 55.6 L77.1 55.8 L76.8 56.0 L76.5 56.1 L76.2 56.3 L75.9 56.5 L75.6 56.6 L75.3 56.8 L75.0 57.0 L74.7 57.1 L74.4 57.3 L74.1 57.4 L73.8 57.6 L73.5 57.7 L73.2 57.9 L72.9 58.0 L72.6 58.2 L72.3 58.3 L72.0 58.5 L71.7 58.6 L71.4 58.8 L71.0 58.9 L70.7 59.1 L70.4 59.2 L70.1 59.3 L69.8 59.5 L69.5 59.6 L69.2 59.7 L68.8 59.9 L68.5 60.0 L68.2 60.1 L67.9 60.2Z" fill="#0B0B0B"/><circle cx="68.4" cy="61.6" r="1.5" fill="#0B0B0B"/><circle cx="95.5" cy="46.8" r="6.2" fill="#0B0B0B"/><path d="M67.8 67.3 L68.1 67.5 L68.4 67.7 L68.7 67.9 L69.0 68.1 L69.3 68.3 L69.6 68.5 L69.9 68.8 L70.2 69.0 L70.6 69.2 L70.9 69.4 L71.2 69.6 L71.5 69.8 L71.8 70.0 L72.1 70.2 L72.4 70.4 L72.7 70.7 L73.0 70.9 L73.3 71.1 L73.6 71.3 L73.9 71.5 L74.3 71.7 L74.6 71.9 L74.9 72.1 L75.2 72.3 L75.5 72.5 L75.8 72.7 L76.1 72.9 L76.4 73.1 L76.8 73.3 L77.1 73.5 L77.4 73.7 L77.7 73.9 L78.0 74.1 L78.3 74.3 L78.7 74.5 L79.0 74.7 L79.3 74.9 L79.6 75.1 L79.9 75.3 L80.3 75.5 L80.6 75.7 L80.9 75.9 L81.2 76.1 L81.5 76.3 L81.9 76.4 L82.2 76.6 L82.5 76.8 L82.8 77.0 L83.1 77.2 L83.5 77.4 L83.8 77.6 L84.1 77.8 L84.4 78.0 L84.7 78.2 L85.1 78.4 L85.4 78.6 L85.7 78.8 L86.0 79.0 L86.3 79.3 L86.7 79.5 L87.0 79.7 L87.3 79.9 L87.6 80.1 L87.9 80.3 L88.3 80.5 L88.6 80.7 L88.9 81.0 L89.2 81.2 L89.5 81.4 L89.9 81.6 L90.2 81.8 L90.5 82.1 L90.8 82.3 L91.2 82.5 L91.5 82.7 L91.8 82.9 L92.1 83.2 L92.5 83.4 L92.8 83.6 L93.1 83.8 L93.4 84.0 L93.8 84.2 L94.1 84.4 L94.5 84.6 L94.8 84.8 L95.1 85.0 L95.5 85.2 L95.8 85.4 L96.2 85.6 L96.5 85.8 L100.1 74.6 L99.7 74.6 L99.4 74.6 L99.0 74.5 L98.6 74.5 L98.3 74.5 L97.9 74.4 L97.6 74.4 L97.2 74.4 L96.8 74.3 L96.5 74.3 L96.1 74.3 L95.7 74.2 L95.4 74.2 L95.0 74.2 L94.7 74.1 L94.3 74.1 L93.9 74.0 L93.6 74.0 L93.2 74.0 L92.8 73.9 L92.5 73.9 L92.1 73.8 L91.7 73.8 L91.4 73.7 L91.0 73.7 L90.7 73.6 L90.3 73.6 L89.9 73.5 L89.6 73.4 L89.2 73.4 L88.9 73.3 L88.5 73.2 L88.2 73.1 L87.8 73.0 L87.5 72.9 L87.1 72.9 L86.8 72.8 L86.4 72.7 L86.1 72.6 L85.7 72.5 L85.4 72.3 L85.0 72.2 L84.7 72.1 L84.4 72.0 L84.0 71.9 L83.7 71.8 L83.3 71.6 L83.0 71.5 L82.7 71.4 L82.3 71.3 L82.0 71.1 L81.6 71.0 L81.3 70.9 L81.0 70.7 L80.6 70.6 L80.3 70.5 L80.0 70.3 L79.6 70.2 L79.3 70.0 L79.0 69.9 L78.7 69.8 L78.3 69.6 L78.0 69.5 L77.7 69.3 L77.3 69.2 L77.0 69.0 L76.7 68.9 L76.3 68.7 L76.0 68.6 L75.7 68.4 L75.4 68.3 L75.0 68.1 L74.7 67.9 L74.4 67.8 L74.0 67.6 L73.7 67.5 L73.4 67.3 L73.1 67.1 L72.7 67.0 L72.4 66.8 L72.1 66.6 L71.8 66.5 L71.5 66.3 L71.1 66.1 L70.8 65.9 L70.5 65.7 L70.2 65.6 L69.9 65.4 L69.6 65.2 L69.3 65.0Z" fill="#0B0B0B"/><circle cx="68.5" cy="66.1" r="1.4" fill="#0B0B0B"/><circle cx="98.3" cy="80.2" r="5.9" fill="#0B0B0B"/><path d="M64.6 68.9 L64.7 69.3 L64.8 69.6 L64.9 70.0 L65.0 70.4 L65.1 70.7 L65.1 71.1 L65.2 71.5 L65.3 71.8 L65.4 72.2 L65.5 72.6 L65.6 72.9 L65.7 73.3 L65.8 73.7 L65.9 74.0 L66.0 74.4 L66.1 74.8 L66.2 75.1 L66.3 75.5 L66.4 75.9 L66.5 76.2 L66.6 76.6 L66.7 77.0 L66.8 77.3 L66.9 77.7 L67.0 78.0 L67.1 78.4 L67.3 78.8 L67.4 79.1 L67.5 79.5 L67.6 79.8 L67.7 80.2 L67.8 80.6 L67.9 80.9 L68.0 81.3 L68.1 81.7 L68.2 82.0 L68.4 82.4 L68.5 82.7 L68.6 83.1 L68.7 83.5 L68.8 83.8 L68.9 84.2 L69.0 84.6 L69.1 84.9 L69.2 85.3 L69.3 85.6 L69.5 86.0 L69.6 86.4 L69.7 86.7 L69.8 87.1 L69.9 87.5 L70.0 87.8 L70.2 88.2 L70.3 88.6 L70.4 88.9 L70.5 89.3 L70.6 89.7 L70.8 90.0 L70.9 90.4 L71.0 90.8 L71.2 91.1 L71.3 91.5 L71.4 91.9 L71.6 92.2 L71.7 92.6 L71.9 92.9 L72.0 93.3 L72.2 93.7 L72.3 94.0 L72.5 94.4 L72.6 94.7 L72.8 95.1 L73.0 95.4 L73.1 95.8 L73.3 96.1 L73.5 96.5 L73.6 96.8 L73.8 97.2 L74.0 97.5 L74.2 97.9 L74.4 98.2 L74.5 98.6 L74.7 98.9 L74.9 99.3 L75.1 99.6 L75.3 100.0 L75.5 100.3 L75.7 100.7 L75.9 101.0 L76.0 101.4 L83.4 96.0 L83.1 95.8 L82.9 95.5 L82.7 95.3 L82.4 95.0 L82.2 94.7 L81.9 94.5 L81.7 94.2 L81.5 93.9 L81.2 93.6 L81.0 93.4 L80.8 93.1 L80.6 92.8 L80.3 92.5 L80.1 92.3 L79.9 92.0 L79.7 91.7 L79.4 91.4 L79.2 91.2 L79.0 90.9 L78.8 90.6 L78.6 90.3 L78.3 90.0 L78.1 89.8 L77.9 89.5 L77.7 89.2 L77.4 88.9 L77.2 88.6 L77.0 88.4 L76.8 88.1 L76.6 87.8 L76.4 87.5 L76.1 87.2 L75.9 86.9 L75.7 86.6 L75.5 86.3 L75.3 86.1 L75.1 85.8 L74.9 85.5 L74.7 85.2 L74.5 84.9 L74.2 84.6 L74.0 84.3 L73.9 84.0 L73.7 83.7 L73.5 83.4 L73.3 83.1 L73.1 82.8 L72.9 82.4 L72.7 82.1 L72.5 81.8 L72.4 81.5 L72.2 81.2 L72.0 80.9 L71.8 80.6 L71.7 80.2 L71.5 79.9 L71.4 79.6 L71.2 79.3 L71.1 78.9 L70.9 78.6 L70.8 78.3 L70.6 77.9 L70.5 77.6 L70.3 77.3 L70.2 76.9 L70.1 76.6 L69.9 76.3 L69.8 75.9 L69.7 75.6 L69.6 75.2 L69.4 74.9 L69.3 74.6 L69.2 74.2 L69.1 73.9 L69.0 73.5 L68.9 73.2 L68.7 72.8 L68.6 72.5 L68.5 72.1 L68.4 71.8 L68.3 71.4 L68.2 71.1 L68.1 70.7 L68.0 70.4 L67.9 70.0 L67.8 69.7 L67.8 69.3 L67.7 68.9 L67.6 68.6 L67.5 68.2Z" fill="#0B0B0B"/><circle cx="66.1" cy="68.6" r="1.5" fill="#0B0B0B"/><circle cx="79.7" cy="98.7" r="4.5" fill="#0B0B0B"/><path d="M59.6 66.3 L59.3 66.5 L59.0 66.7 L58.6 66.9 L58.3 67.2 L58.0 67.4 L57.6 67.6 L57.3 67.8 L57.0 68.0 L56.6 68.3 L56.3 68.5 L56.0 68.7 L55.7 68.9 L55.3 69.2 L55.0 69.4 L54.7 69.6 L54.4 69.8 L54.0 70.1 L53.7 70.3 L53.4 70.5 L53.1 70.7 L52.7 71.0 L52.4 71.2 L52.1 71.4 L51.8 71.7 L51.5 71.9 L51.1 72.1 L50.8 72.3 L50.5 72.6 L50.2 72.8 L49.8 73.0 L49.5 73.3 L49.2 73.5 L48.9 73.7 L48.5 73.9 L48.2 74.2 L47.9 74.4 L47.6 74.6 L47.2 74.9 L46.9 75.1 L46.6 75.3 L46.3 75.5 L45.9 75.8 L45.6 76.0 L45.3 76.2 L44.9 76.4 L44.6 76.7 L44.2 76.9 L43.9 77.1 L43.6 77.3 L43.2 77.6 L42.9 77.8 L42.6 78.0 L42.2 78.3 L41.9 78.5 L41.5 78.7 L41.2 79.0 L40.9 79.2 L40.5 79.4 L40.2 79.7 L39.9 79.9 L39.5 80.2 L39.2 80.4 L38.9 80.6 L38.5 80.9 L38.2 81.1 L37.9 81.4 L37.6 81.7 L37.2 81.9 L36.9 82.2 L36.6 82.4 L36.3 82.7 L36.0 83.0 L35.6 83.3 L35.3 83.5 L35.0 83.8 L34.7 84.1 L34.4 84.4 L34.1 84.7 L33.8 84.9 L33.5 85.2 L33.2 85.5 L32.9 85.8 L32.6 86.1 L32.3 86.4 L32.0 86.7 L31.7 87.0 L31.4 87.3 L31.1 87.6 L30.8 87.9 L30.5 88.2 L41.0 95.5 L41.2 95.1 L41.3 94.8 L41.5 94.4 L41.6 94.1 L41.8 93.7 L41.9 93.4 L42.1 93.1 L42.2 92.7 L42.4 92.4 L42.6 92.1 L42.7 91.7 L42.9 91.4 L43.1 91.1 L43.2 90.7 L43.4 90.4 L43.6 90.1 L43.8 89.7 L43.9 89.4 L44.1 89.1 L44.3 88.8 L44.4 88.4 L44.6 88.1 L44.8 87.8 L45.0 87.4 L45.1 87.1 L45.3 86.8 L45.5 86.4 L45.7 86.1 L45.8 85.8 L46.0 85.4 L46.2 85.1 L46.4 84.8 L46.6 84.4 L46.8 84.1 L46.9 83.8 L47.1 83.4 L47.3 83.1 L47.5 82.8 L47.7 82.4 L47.9 82.1 L48.1 81.8 L48.3 81.5 L48.5 81.2 L48.7 80.8 L48.9 80.5 L49.2 80.2 L49.4 79.9 L49.6 79.6 L49.8 79.3 L50.1 79.0 L50.3 78.7 L50.5 78.4 L50.8 78.1 L51.0 77.8 L51.2 77.5 L51.5 77.2 L51.7 76.9 L52.0 76.7 L52.2 76.4 L52.5 76.1 L52.8 75.8 L53.0 75.5 L53.3 75.3 L53.6 75.0 L53.8 74.7 L54.1 74.5 L54.4 74.2 L54.7 74.0 L54.9 73.7 L55.2 73.4 L55.5 73.2 L55.8 72.9 L56.1 72.7 L56.4 72.4 L56.7 72.2 L57.0 72.0 L57.3 71.7 L57.6 71.5 L57.8 71.2 L58.1 71.0 L58.5 70.8 L58.8 70.5 L59.1 70.3 L59.4 70.1 L59.7 69.8 L60.0 69.6 L60.3 69.4 L60.6 69.2 L60.9 68.9 L61.3 68.7Z" fill="#0B0B0B"/><circle cx="60.4" cy="67.5" r="1.5" fill="#0B0B0B"/><circle cx="35.7" cy="91.8" r="6.4" fill="#0B0B0B"/><path d="M59.2 63.5 L58.9 63.5 L58.6 63.5 L58.3 63.5 L58.0 63.5 L57.7 63.5 L57.4 63.4 L57.1 63.4 L56.8 63.4 L56.5 63.4 L56.2 63.4 L55.9 63.4 L55.7 63.4 L55.4 63.3 L55.1 63.3 L54.8 63.3 L54.5 63.3 L54.2 63.3 L53.9 63.3 L53.6 63.3 L53.3 63.2 L53.0 63.2 L52.7 63.2 L52.4 63.2 L52.2 63.2 L51.9 63.2 L51.6 63.2 L51.3 63.1 L51.0 63.1 L50.7 63.1 L50.4 63.1 L50.1 63.1 L49.8 63.1 L49.5 63.1 L49.2 63.1 L48.9 63.1 L48.6 63.1 L48.3 63.1 L48.1 63.1 L47.8 63.1 L47.5 63.1 L47.2 63.1 L46.9 63.1 L46.6 63.1 L46.3 63.1 L46.0 63.1 L45.7 63.2 L45.4 63.2 L45.1 63.2 L44.8 63.2 L44.5 63.2 L44.2 63.3 L43.9 63.3 L43.6 63.3 L43.3 63.4 L43.0 63.4 L42.8 63.4 L42.5 63.5 L42.2 63.5 L41.9 63.6 L41.6 63.6 L41.3 63.6 L41.0 63.7 L40.7 63.7 L40.4 63.8 L40.1 63.8 L39.8 63.9 L39.5 63.9 L39.2 64.0 L38.9 64.0 L38.6 64.1 L38.3 64.1 L38.0 64.1 L37.7 64.2 L37.4 64.2 L37.1 64.3 L36.8 64.3 L36.5 64.4 L36.2 64.4 L35.9 64.4 L35.5 64.5 L35.2 64.5 L34.9 64.6 L34.6 64.6 L34.3 64.6 L34.0 64.7 L33.7 64.7 L33.3 64.8 L33.0 64.8 L32.7 64.8 L32.4 64.9 L36.3 73.7 L36.5 73.5 L36.7 73.4 L36.9 73.2 L37.1 73.0 L37.3 72.8 L37.5 72.6 L37.7 72.5 L38.0 72.3 L38.2 72.1 L38.4 72.0 L38.6 71.8 L38.8 71.6 L39.1 71.5 L39.3 71.3 L39.5 71.2 L39.7 71.0 L40.0 70.9 L40.2 70.8 L40.4 70.6 L40.7 70.5 L40.9 70.4 L41.2 70.3 L41.4 70.1 L41.6 70.0 L41.9 69.9 L42.1 69.8 L42.4 69.7 L42.6 69.6 L42.9 69.5 L43.1 69.4 L43.3 69.3 L43.6 69.2 L43.8 69.1 L44.1 69.0 L44.3 68.9 L44.6 68.8 L44.8 68.7 L45.1 68.6 L45.3 68.5 L45.6 68.5 L45.9 68.4 L46.1 68.3 L46.4 68.2 L46.6 68.1 L46.9 68.0 L47.1 68.0 L47.4 67.9 L47.6 67.8 L47.9 67.7 L48.2 67.6 L48.4 67.6 L48.7 67.5 L48.9 67.4 L49.2 67.3 L49.5 67.3 L49.7 67.2 L50.0 67.1 L50.2 67.1 L50.5 67.0 L50.8 66.9 L51.0 66.9 L51.3 66.8 L51.6 66.7 L51.8 66.7 L52.1 66.6 L52.4 66.6 L52.6 66.5 L52.9 66.5 L53.2 66.4 L53.5 66.4 L53.7 66.4 L54.0 66.3 L54.3 66.3 L54.6 66.3 L54.8 66.3 L55.1 66.2 L55.4 66.2 L55.7 66.2 L55.9 66.2 L56.2 66.2 L56.5 66.2 L56.8 66.2 L57.0 66.2 L57.3 66.2 L57.6 66.2 L57.9 66.2 L58.2 66.2 L58.4 66.2 L58.7 66.2 L59.0 66.2Z" fill="#0B0B0B"/><circle cx="59.1" cy="64.9" r="1.4" fill="#0B0B0B"/><circle cx="34.3" cy="69.3" r="4.8" fill="#0B0B0B"/><path d="M61.3 59.8 L61.1 59.6 L60.9 59.3 L60.7 59.1 L60.5 58.8 L60.3 58.6 L60.1 58.3 L60.0 58.1 L59.8 57.9 L59.6 57.6 L59.4 57.4 L59.2 57.1 L59.0 56.9 L58.8 56.6 L58.6 56.4 L58.4 56.1 L58.3 55.9 L58.1 55.6 L57.9 55.4 L57.7 55.1 L57.5 54.8 L57.3 54.6 L57.1 54.3 L56.9 54.1 L56.8 53.8 L56.6 53.6 L56.4 53.3 L56.2 53.1 L56.0 52.8 L55.8 52.6 L55.6 52.3 L55.4 52.1 L55.2 51.8 L55.0 51.6 L54.9 51.3 L54.7 51.1 L54.5 50.8 L54.3 50.6 L54.1 50.3 L53.9 50.1 L53.7 49.9 L53.5 49.6 L53.3 49.4 L53.1 49.1 L52.9 48.9 L52.6 48.6 L52.4 48.4 L52.2 48.2 L52.0 47.9 L51.8 47.7 L51.6 47.4 L51.4 47.2 L51.2 47.0 L51.0 46.7 L50.8 46.5 L50.6 46.2 L50.4 46.0 L50.1 45.8 L49.9 45.5 L49.7 45.3 L49.5 45.0 L49.3 44.8 L49.1 44.5 L48.9 44.3 L48.7 44.0 L48.5 43.8 L48.3 43.5 L48.1 43.2 L47.9 43.0 L47.7 42.7 L47.5 42.5 L47.3 42.2 L47.1 41.9 L46.9 41.7 L46.7 41.4 L46.5 41.1 L46.3 40.8 L46.1 40.6 L45.9 40.3 L45.7 40.0 L45.5 39.7 L45.3 39.4 L45.1 39.2 L44.9 38.9 L44.7 38.6 L44.5 38.3 L44.3 38.0 L44.1 37.8 L43.9 37.5 L43.7 37.2 L43.5 36.9 L36.3 47.7 L36.6 47.8 L36.9 47.8 L37.2 47.9 L37.5 48.0 L37.8 48.0 L38.2 48.1 L38.5 48.2 L38.8 48.2 L39.1 48.3 L39.4 48.4 L39.7 48.5 L40.0 48.5 L40.3 48.6 L40.6 48.7 L40.9 48.8 L41.2 48.9 L41.4 49.0 L41.7 49.1 L42.0 49.2 L42.3 49.3 L42.6 49.4 L42.9 49.5 L43.2 49.6 L43.4 49.7 L43.7 49.8 L44.0 50.0 L44.3 50.1 L44.5 50.2 L44.8 50.3 L45.1 50.5 L45.3 50.6 L45.6 50.8 L45.9 50.9 L46.1 51.1 L46.4 51.2 L46.6 51.4 L46.9 51.5 L47.2 51.7 L47.4 51.8 L47.7 52.0 L47.9 52.1 L48.2 52.3 L48.4 52.5 L48.7 52.6 L48.9 52.8 L49.2 53.0 L49.4 53.1 L49.6 53.3 L49.9 53.5 L50.1 53.6 L50.4 53.8 L50.6 54.0 L50.9 54.2 L51.1 54.3 L51.4 54.5 L51.6 54.7 L51.8 54.9 L52.1 55.0 L52.3 55.2 L52.6 55.4 L52.8 55.6 L53.1 55.8 L53.3 55.9 L53.5 56.1 L53.8 56.3 L54.0 56.5 L54.2 56.7 L54.5 56.9 L54.7 57.1 L54.9 57.3 L55.2 57.5 L55.4 57.6 L55.6 57.8 L55.9 58.0 L56.1 58.2 L56.3 58.4 L56.5 58.7 L56.8 58.9 L57.0 59.1 L57.2 59.3 L57.4 59.5 L57.6 59.7 L57.8 59.9 L58.0 60.1 L58.3 60.4 L58.5 60.6 L58.7 60.8 L58.9 61.0 L59.1 61.3 L59.3 61.5Z" fill="#0B0B0B"/><circle cx="60.3" cy="60.7" r="1.3" fill="#0B0B0B"/><circle cx="39.9" cy="42.3" r="6.5" fill="#0B0B0B"/></g></svg>`;
  const CSS = `
    :host { all: initial; display: block; margin: 16px 0 20px; font: 400 14px/1.45 Roboto, -apple-system, Arial, sans-serif;
      --bg: #fff; --fl: #f2f2f2; --ink: #0f0f0f; --leise: #606060; --linie: #e5e5e5; --akz: #0b0b0b; --akz-soft: #CDDE30; --akz-text: #0b0b0b; --marke: #CDDE30;
      --gut: #0f7b3f; --gut-soft: #dff3e6; --schw: #b3261e; --schw-soft: #fce8e6; color: var(--ink); }
    :host([data-dunkel="ja"]) { --bg: #0f0f0f; --fl: #272727; --ink: #f1f1f1; --leise: #aaa; --linie: #3a3a3a; --akz: #CDDE30; --akz-soft: #CDDE30; --akz-text: #0b0b0b; --marke: #CDDE30;
      --gut: #7fd8a0; --gut-soft: #1f3a2a; --schw: #ff8a80; --schw-soft: #4a2321; }
    :host([data-schwebend="ja"]) { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(980px, calc(100vw - 32px));
      margin: 0; z-index: 2147483000; max-height: 60vh; overflow: auto; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.28); }
    * { box-sizing: border-box; }
    .panel { border: 1px solid var(--akz); border-radius: 12px; background: var(--bg); padding: 12px 14px; }
    .panel.zu { padding: 8px 14px; }
    header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .titel { display: inline-flex; align-items: center; font-weight: 500; font-size: 15px; border: 0; background: none; color: var(--ink); padding: 6px 4px; }
    .pfeil { display: inline-block; width: 14px; color: var(--akz); }
    .kopf-info { flex: 1; color: var(--leise); font-size: 13px; min-width: 200px; }
    .kopf-info b, .zeile b { color: var(--ink); font-weight: 500; }
    .knoepfe { display: flex; gap: 6px; }
    button { font: inherit; font-size: 13px; color: var(--ink); background: transparent; border: 1px solid var(--linie); border-radius: 8px; padding: 6px 10px; cursor: pointer; min-height: 32px; }
    button:hover { background: var(--fl); }
    .zahnrad { font-size: 18px; line-height: 1; padding: 4px 10px; }
    button.gespeichert { background: var(--akz-soft); color: var(--akz-text); border-color: var(--akz-soft); font-weight: 500; }
    select { font: inherit; font-size: 13px; color: var(--ink); background: var(--bg); border: 1px solid var(--linie); border-radius: 8px; padding: 6px 8px; min-height: 32px; }
    .chip.an { background: var(--akz-soft); color: var(--akz-text); border-color: var(--akz-soft); font-weight: 500; }
    /* HandKess-Branding – Platzhalter (2026-11-13), bis Logo-Dateien, Hex-Wert und Schrift von André da sind */
    .hk-symbol { width: 22px; height: 22px; vertical-align: middle; margin-right: 7px; flex: none; }
    .hk { display: inline-flex; align-items: center; font: 900 15px/1 "Arial Black", "Helvetica Neue", Arial, sans-serif; letter-spacing: .01em; color: var(--ink); white-space: nowrap; }
    .hk-punkt { width: .42em; height: .42em; border-radius: 50%; background: var(--marke); margin: 0 .16em; }
    .hk-kess { font-style: italic; padding: 0 .12em; background: linear-gradient(transparent 58%, var(--marke) 58%); }
    .hk-sub { font-weight: 500; margin-left: .55em; color: var(--leise); }
    :host([data-dunkel="ja"]) .hk-kess { background: none; color: var(--marke); }
    .hinweis { margin-top: 10px; padding: 8px 10px; background: var(--fl); border-radius: 8px; font-size: 13px; }
    .hinweis.fehler { background: var(--schw-soft); color: var(--schw); }
    .einst { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 10px; padding: 8px 10px; background: var(--fl); border-radius: 8px; font-size: 13px; }
    .kacheln { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-top: 10px; }
    .kachel { background: var(--fl); border-radius: 8px; padding: 8px 12px; }
    .kachel .l { font-size: 12px; color: var(--leise); }
    .kachel .w { font-size: 20px; font-weight: 500; }
    .kachel .z { font-size: 11px; color: var(--leise); margin-top: 2px; }
    .marker { margin-top: 8px; font-size: 13px; color: var(--leise); }
    .plus { color: var(--gut); } .minus { color: var(--schw); }
    .reihe { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
    .lab { font-size: 12px; color: var(--leise); width: 70px; } .lab.abstand { width: auto; margin-left: 10px; }
    .leise { color: var(--leise); font-size: 13px; } .zeile { margin-top: 8px; font-size: 12px; }
    .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; margin-top: 14px; }
    .karte { border: 1px solid var(--linie); border-radius: 12px; overflow: hidden; background: var(--bg); }
    .bild { position: relative; display: block; aspect-ratio: var(--bildformat, 16/9); background: var(--fl); }
    .bild img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .platz, .er { position: absolute; top: 6px; font-size: 12px; font-weight: 500; padding: 3px 6px; border-radius: 4px; }
    .platz { left: 6px; background: rgba(0,0,0,.78); color: #fff; }
    .er { right: 6px; background: rgba(0,0,0,.78); color: #fff; }
    .er.gut { background: var(--gut-soft); color: var(--gut); } .er.schwach { background: var(--schw-soft); color: var(--schw); }
    .info { padding: 8px 10px 10px; }
    .vtitel { display: block; color: var(--ink); text-decoration: none; font-weight: 500; font-size: 14px; line-height: 1.35; margin-bottom: 6px; }
    .vtitel:hover { text-decoration: underline; }
    .kv { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--leise); }
    .kv b { color: var(--ink); font-weight: 500; }
    .geschaetzt { font-style: italic; } .geschaetzt::before { content: "≈ "; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tag { font-size: 12px; padding: 2px 7px; min-height: 24px; border-color: transparent; background: var(--akz-soft); color: var(--akz-text); }
    .tageingabe { width: 100%; margin-top: 6px; height: 30px; font: inherit; font-size: 12px; color: var(--ink); background: var(--bg); border: 1px solid var(--linie); border-radius: 8px; padding: 0 8px; }
    .tageingabe.schmal { width: 200px; margin-top: 0; }
    .mehr { margin-top: 12px; text-align: center; }
    .oben { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 10px; }
    .oben .kachel { min-width: 160px; } .oben .reihe { margin-top: 0; }
    .yt-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .yt-tag { font-size: 12px; padding: 2px 8px; border-radius: 8px; background: var(--fl); color: var(--leise); }
    .block { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--linie); }
    .block-kopf { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 15px; }
    .block-kopf b { font-weight: 500; }`;
})();
