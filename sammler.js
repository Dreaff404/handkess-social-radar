// Social-Radar – Sammler für Plattformen ohne eigenen Abruf (Instagram, TikTok – Weg „Mitlesen“).
// Nimmt, was das Mitlese-Skript der Plattform im Seitenkontext per postMessage meldet ({ socialRadar, quelle, profile, medien }),
// führt die Werte je Beitrag zusammen, speichert pro Profil lokal („<präfix>:<name>“) und scrollt für „Alle laden“.
// Die Plattform-Datei liefert nur: quelle, präfix, Listen (Tabs), normal() für ihr Datenformat, seite() und Texte.
// raster (optional): Element der Liste – „Alle laden“ springt dann jeweils ans Ende der Liste (Facebook lädt erst kurz davor nach);
// geduld: Runden ohne Neues bis Schluss
const RadarSammler = ({ quelle, praefix, listen, normal, seite, bereichFuer, texte, raster = null, geduld = 4 }) => {
  const profile = {};            // name → { kanal, listen: { <liste>: [id] }, aktualisiert }
  const medien = {};             // id → Beitrag im gemeinsamen Format (alle Profile)
  let letztesProfil = null, gebremst = false, rueckrufe = [], speichernTimer = {};

  // Neue Werte ergänzen alte, fehlende (null) überschreiben nichts – z. B. Reels-Tab bringt Views, Raster das Datum
  function zusammen(alt, neu) {
    if (!alt) return neu;
    const z = { ...alt };
    for (const [k, v] of Object.entries(neu)) if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) z[k] = v;
    return z;
  }
  const profil = name => (profile[name] ||= { kanal: { id: praefix + ":" + name, name, handle: name, follower: 0 }, listen: Object.fromEntries(listen.map(l => [l, []])), aktualisiert: 0 });

  window.addEventListener("message", e => {
    if (e.source !== window || !e.data?.socialRadar || e.data.quelle !== quelle) return;
    if (e.data.gebremst) { gebremst = true; return; }
    const ziel = seite()?.name || letztesProfil;
    (e.data.profile || []).forEach(p => {
      const name = p.username.toLowerCase();
      if (ziel && name !== ziel) return;            // nur das Profil der Seite, keine Vorschläge
      const pr = profil(name);
      // Eine genaue Followerzahl wird nicht von einer gerundeten überschrieben (TikTok: Profil genau, Videos gerundet)
      const genauBleibt = pr.kanal.followerGenau && p.genau === false;
      pr.kanal = { ...pr.kanal, name: p.name || pr.kanal.name || p.username, handle: p.username, pk: p.pk ?? pr.kanal.pk,
        follower: genauBleibt ? pr.kanal.follower : (p.follower || pr.kanal.follower), followerGenau: genauBleibt || p.genau !== false };
      merken(name);
    });
    (e.data.medien || []).forEach(({ liste, m }) => {
      const v = normal(m);
      if (!v?.id) return;
      medien[v.id] = zusammen(medien[v.id], v);
      if (liste && ziel && listen.includes(liste)) {
        const pr = profil(ziel);
        if (!pr.listen[liste].includes(v.id)) pr.listen[liste].push(v.id);
        if (laeuft) imLauf.add(v.id);   // auch schon Bekanntes zählt als Fortschritt (die Plattform liefert von oben erneut)
        merken(ziel);
      }
    });
    rueckrufe.forEach(r => r());
  });

  // Pro Profil gebündelt speichern (höchstens alle 2 Sekunden), höchstens 1000 Beiträge
  function merken(name) {
    const pr = profile[name];
    pr.aktualisiert = Date.now();
    clearTimeout(speichernTimer[name]);
    speichernTimer[name] = setTimeout(() => {
      const ids = [...new Set(listen.flatMap(l => pr.listen[l]))].slice(-1000);
      try { chrome.storage.local.set({ [praefix + ":" + name]: { ...pr, medien: Object.fromEntries(ids.filter(c => medien[c]).map(c => [c, medien[c]])) } }); } catch { }
    }, 2000);
  }

  // Gespeicherten Stand einmal pro Seite einlesen und mit dem schon Mitgelesenen zusammenführen –
  // auch wenn die Seite vorher schon erste Daten gemeldet hat (sonst fehlten nach dem Neuladen die gesammelten Beiträge)
  const eingelesen = new Set();
  async function ausSpeicher(name) {
    if (eingelesen.has(name)) return profile[name] || null;
    eingelesen.add(name);
    const d = (await chrome.storage.local.get(praefix + ":" + name))[praefix + ":" + name];
    if (!d) return profile[name] || null;
    Object.entries(d.medien || {}).forEach(([c, v]) => { medien[c] = zusammen(v, medien[c] || {}); });
    const pr = profil(name);
    pr.kanal = { ...d.kanal, ...(pr.kanal.follower ? pr.kanal : {}) };
    listen.forEach(l => { pr.listen[l] = [...new Set([...(d.listen?.[l] || []), ...pr.listen[l]])]; });
    pr.aktualisiert = Math.max(pr.aktualisiert, d.aktualisiert || 0);
    if (pr.aktualisiert) merken(name);   // Zusammengeführtes sichern, damit es beim nächsten Speichern nicht verloren geht
    return pr;
  }

  async function profilMit(id) {
    const alles = await chrome.storage.local.get(null);
    const treffer = Object.entries(alles).find(([k, d]) => k.startsWith(praefix + ":") && listen.some(l => d?.listen?.[l]?.includes(id)));
    return treffer ? treffer[0].slice(praefix.length + 1) : null;
  }

  const profilDaten = (pr, bereich) => ({
    kanal: pr.kanal, bereich, gemischt: false, geladenAm: pr.aktualisiert || Date.now(),
    videos: pr.listen[bereich].map(c => medien[c]).filter(v => v?.datum)
  });

  // Ergebnis für das Panel wie bei YouTube: { daten, einzel?, hinweis?, warten? } – ohne Netzwerk, nur aus dem Gesammelten
  async function laden(s) {
    if (s.bereich === "video") {
      // Profil, in dessen Liste der Beitrag steht (Kooperationen laufen unter einem anderen Konto), sonst der Besitzer
      const v = medien[s.videoId];
      const inListe = [s.name, letztesProfil].find(n => n && profile[n] && listen.some(l => profile[n].listen[l].includes(s.videoId)));
      let name = inListe || s.name || v?.besitzer || letztesProfil;
      // Direkt per Link geöffnet (kein Profil bekannt): im gespeicherten Stand nachsehen, in welchem Profil der Beitrag steht
      if (!name || !(await ausSpeicher(name))) name = await profilMit(s.videoId) || name;
      const pr = name ? await ausSpeicher(name) : null;
      const m = medien[s.videoId];
      if (!m) return { warten: true, hinweis: texte.wartenEinzel };
      const bereich = bereichFuer(m, pr);
      return {
        daten: pr ? profilDaten(pr, bereich) : { kanal: { id: praefix + ":" + (name || "?"), name: name || "Profil", handle: name, follower: 0 }, videos: [], bereich, geladenAm: Date.now() },
        einzel: { ...m, url: location.href },
        hinweis: pr?.kanal.follower ? "" : "Das Profil wurde noch nicht geöffnet – Follower und Einordnung fehlen. Einmal das Profil aufrufen."
      };
    }
    letztesProfil = s.name;
    const pr = await ausSpeicher(s.name) || profil(s.name);
    const daten = profilDaten(pr, s.bereich);
    if (!daten.videos.length) return { daten, warten: true, hinweis: texte.wartenListe };
    return { daten, hinweis: pr.kanal.follower ? "" : "Followerzahl noch nicht gesehen – Profil einmal neu laden." };
  }

  // „Alle laden“: langsam scrollen, die Plattform lädt dabei selbst nach. Stopp bei Knopfdruck, ohne Neues oder wenn sie bremst.
  // fertigWenn: optionale Bedingung für vorzeitigen Schluss (z. B. alle fehlenden Views gefunden)
  let laeuft = false, stopp = false, imLauf = new Set();
  async function alleLaden(fortschritt, { fertigWenn } = {}) {
    if (laeuft) { stopp = true; return; }
    laeuft = true; stopp = false; gebremst = false;
    imLauf = new Set();
    const s = seite(), anzahl = () => profil(s.name).listen[s.bereich].length, gesehen = () => imLauf.size;
    let vorher = gesehen(), ohneNeu = 0, grund = "fertig";
    for (let runde = 0; runde < 150; runde++) {
      if (stopp) { grund = "gestoppt"; break; }
      if (gebremst) { grund = "gebremst"; break; }
      const r = raster?.(), vorY = scrollY;
      if (r) window.scrollTo(0, Math.max(scrollY + innerHeight * 0.5, r.getBoundingClientRect().bottom + scrollY - innerHeight * 0.9));
      else window.scrollBy(0, Math.round(innerHeight * 1.4));
      // Schon am Seitenende: kurz ein Stück zurück und wieder runter – sonst merkt die Plattform nicht, dass weitergelesen wird
      if (Math.abs(scrollY - vorY) < 5) {
        window.scrollBy(0, -Math.round(innerHeight * 0.7));
        await new Promise(r2 => setTimeout(r2, 400));
        window.scrollTo(0, document.documentElement.scrollHeight);
      }
      await new Promise(r => setTimeout(r, 1800 + Math.random() * 1400));
      const jetzt = gesehen();
      ohneNeu = jetzt > vorher ? 0 : ohneNeu + 1;
      vorher = jetzt;
      fortschritt(anzahl());
      if (fertigWenn?.()) break;
      if (ohneNeu >= geduld) break;
    }
    laeuft = false;
    return { anzahl: anzahl(), grund };
  }

  return { profile, medien, laden, alleLaden, laeuft: () => laeuft, beiNeuenDaten: r => rueckrufe.push(r) };
};
