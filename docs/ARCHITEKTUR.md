# Architektur

Chrome-Erweiterung nach Manifest V3, ohne Build-Schritt, ohne Frameworks und ohne externe Bibliotheken.

## Dateien

| Datei | Aufgabe |
|---|---|
| `manifest.json` | Berechtigungen: nur `storage`; Netz nur zu `https://www.googleapis.com/*` |
| `kern.js` | Rechenkern für alle Plattformen: Kennzahlen, Filter, Sortierung, Trend, Kanal-Score, Portfolio, Views-Schätzung, deutsche Zahlenformate |
| `radar-hintergrund.js` | Service Worker: Abrufe über die YouTube Data API v3, Zwischenspeicher, Klick auf das Symbol öffnet das Dashboard |
| `panel.js` | Das Radar auf der Plattform-Seite (Shadow DOM): Rangliste, Kennzahlen, Overlays, Leiste am einzelnen Beitrag, Speichern, Marker, Wochenstand |
| `youtube.js` | Plattform-Baustein YouTube: Seiten erkennen, Anker für das Panel, Abruf über den Hintergrund |
| `instagram.js`, `tiktok.js`, `facebook.js` | Plattform-Bausteine: Seiten erkennen, Raster finden, Daten ins gemeinsame Format bringen |
| `*-mitlesen.js` | laufen im Seitenkontext vor den Skripten der Plattform und lesen die Antworten mit, die die Seite ohnehin lädt – ohne eigene Anfragen |
| `sammler.js` | führt Mitgelesenes je Beitrag zusammen, speichert pro Profil, „Alle laden“ durch langsames Scrollen |
| `radar-dashboard.html/.js` | Vergleichs-Dashboard: gespeicherte Kanäle in Ordnern, Score, Entwicklung |
| `radar-analyse.html/.js` | Analyse-Studio: Portfolio, Netz, Baukasten, Formate, Posting-Zeiten, Ausreißer, PNG-Export |
| `radar-einstellungen.html/.js` | API-Schlüssel, Grenzwerte, Abrufmenge, Zwischenspeicher |
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

Dashboard / Analyse-Studio ──► lesen nur chrome.storage.local
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
| `dashboardLayout`, `analyseLayout`, `analyseAnsichten` | Anordnung der Kacheln, gespeicherte Diagramm-Ansichten |

Ansichtseinstellungen (Hell/Dunkel, Filter) liegen im `localStorage` der Erweiterungsseiten (`hsr_*`).

## Tests

Entwickelt und geprüft mit Playwright gegen nachgebaute Plattform-Seiten und eine simulierte YouTube-API sowie gegen echte, öffentliche Profile. Die Testskripte liegen außerhalb dieses Repositorys.
