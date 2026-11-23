# Architektur

Chrome-Erweiterung nach Manifest V3, ohne Build-Schritt, ohne Frameworks und ohne externe Bibliotheken.

## Dateien

| Datei | Aufgabe |
|---|---|
| `manifest.json` | Berechtigungen: `storage`, `unlimitedStorage` (Thumbnail-Versionen), `alarms` (tägliches Nachladen, Video-Tracking); Netz nur zu `https://www.googleapis.com/*` und `https://i.ytimg.com/*` |
| `kern.js` | Rechenkern für alle Plattformen: Kennzahlen, Filter, Sortierung, Trend, Kanal-Score, Portfolio, Views-Schätzung, deutsche Zahlenformate |
| `radar-hintergrund.js` | Service Worker: Abrufe über die YouTube Data API v3, Zwischenspeicher, Video- und Kanal-Verlauf, Thumbnail-Prüfung und -Download, tägliches Nachladen und Video-Tracking (Wecker), API-Budget, Klick auf das Symbol öffnet das Dashboard |
| `panel.js` | Das Radar auf der Plattform-Seite (Shadow DOM): Rangliste, Kennzahlen, Overlays, Leiste am einzelnen Beitrag (YouTube: rechts, einklappbare Abschnitte), Kanal-Mix Videos/Shorts, Speichern, Marker, Wochenstand |
| `youtube.js` | Plattform-Baustein YouTube: Seiten erkennen, Anker für das Panel, Abruf über den Hintergrund |
| `instagram.js`, `tiktok.js`, `facebook.js` | Plattform-Bausteine: Seiten erkennen, Raster finden, Daten ins gemeinsame Format bringen |
| `*-mitlesen.js` | laufen im Seitenkontext vor den Skripten der Plattform und lesen die Antworten mit, die die Seite ohnehin lädt – ohne eigene Anfragen |
| `sammler.js` | führt Mitgelesenes je Beitrag zusammen, speichert pro Profil, „Alle laden“ durch langsames Scrollen |
| `radar-dashboard.html/.js` | Dashboard mit zwei Reitern auf einer Seite; Reiter „Vergleich“: gespeicherte Kanäle in Ordnern, Score, Entwicklung |
| `radar-analyse.js` | Reiter „Analyse•Studio“ im Dashboard (gekapselt, IDs mit `s-`): Portfolio, Netz, Baukasten, Formate, Posting-Zeiten, Ausreißer, PNG-Export. `radar-analyse.html` leitet nur noch auf `radar-dashboard.html#studio` weiter. |
| `radar-einstellungen.html/.js` | API-Schlüssel, Grenzwerte, Abrufmenge, Zwischenspeicher, tägliches Nachladen, getrackte Videos, API-Verbrauch |
| `radar-dashboard-thema.js` | setzt Hell/Dunkel und Paper vor dem ersten Zeichnen (kein Aufblitzen) |
| `icons/` | Kümmel-Stern als SVG und PNG (16–128 px) |

## Datenfluss

```
YouTube-Kanalseite ──► panel.js ──► Nachricht ──► radar-hintergrund.js ──► YouTube Data API v3
                                                     │
                                                     ▼
                                          chrome.storage.local (cache:…)

Instagram/TikTok/Facebook ──► *-mitlesen.js (Seitenkontext, liest geladene Antworten)
                                   │ postMessage
                                   ▼
                              sammler.js ──► chrome.storage.local (ig:…, tt:…, fb:…)

Dashboard (Vergleich | Analyse•Studio) ──► lesen nur chrome.storage.local
```

Alle Plattformen liefern ins selbe Beitragsformat `{ id, titel, url, datum, views, likes, kommentare, … }` – darum rechnen Panel, Dashboard und Studio mit demselben Kern.

## Lokaler Speicher (`chrome.storage.local`)

| Schlüssel | Inhalt |
|---|---|
| `schluessel`, `einstellungen` | API-Schlüssel und Einstellungen |
| `cache:<handle>:<bereich>` | YouTube-Kanal mit Beiträgen (Zwischenspeicher) |
| `ig:<name>`, `tt:<name>`, `fb:<name>` | mitgelesene Profile mit Beiträgen |
| `gespeichert` | Ordner und gespeicherte Profile, „Mein Kanal“ |
| `verlauf` | ein Stand pro Profil und Kalenderwoche (Follower, ER, Views) |
| `marker`, `tags` | eigene Marker und Format-Hashtags |
| `vv:<kanalId>` | Verlauf je YouTube-Video der letzten 30 Tage: Messpunkte `[Zeit, Views, Likes, Kommentare]` (mind. 30 Min. Abstand, beim Tracking 15 Min.) und Thumbnail-Versionen (Prüfsumme + Bild) |
| `vk:<kanalId>` | Kanal-Verlauf `[Zeit, Gesamt-Views, Abonnenten, Videos]`, höchstens ein Punkt je 6 Stunden – Grundlage für „Kanal-Views im Zeitraum“ |
| `autoNachladen`, `autoNachladenStand` | ausgewählte Kanäle (höchstens 10) für das tägliche, sparsame Nachladen (Kanal + neueste 50 Videos und Shorts), letzter Lauf |
| `getrackt` | getrackte Videos (höchstens 20) mit Messungen zu 1/4/8/12/24/48/168 Std. nach Upload |
| `apiVerbrauch` | Verbrauch des Tages (Tageswechsel nach Pazifikzeit wie bei Google): alle Einheiten und der Anteil der Automatik |
| `dashboardLayout`, `analyseLayout`, `analyseAnsichten` | Anordnung der Kacheln, gespeicherte Diagramm-Ansichten |

Ansichtseinstellungen (Hell/Dunkel, Filter, zuletzt offener Reiter `hsr_ansicht`) liegen im `localStorage` der Erweiterungsseiten (`hsr_*`).

## Tests

Entwickelt und geprüft mit Playwright gegen nachgebaute Plattform-Seiten und eine simulierte YouTube-API sowie gegen echte, öffentliche Profile. Die Testskripte liegen außerhalb dieses Repositorys.
