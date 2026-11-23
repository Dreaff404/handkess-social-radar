# Changelog

Alle wichtigen Änderungen, neueste zuerst. Versionsnummern nach [Semantic Versioning](https://semver.org/lang/de/).

## [2.3.7] – 2026-11-23
### Behoben
- Analyse•Studio: Die zuletzt gewählte Plattform-Gruppe ging beim Öffnen verloren (das Studio sprang z. B. auf „YouTube · Shorts“). Sie bleibt jetzt erhalten; ohne gemerkte Gruppe startet das Studio mit „Videos“.
### Dokumentation
- README, Datenschutz, Architektur und Kennzahlen auf Stand 2.3; neue Screenshots mit echten Kanälen (Kanal-Mix, Video-Tracking, Einstellungen „Automatisch nachladen“, Studio als Reiter).

## [2.3.6] – 2026-11-18
### Geändert
- **Videoseite im Stil von HandKess Crowd Pulse:** „Neu laden“ als Limetten-Knopf, daneben ein Zahnrad, das die Einstellungen öffnet.

## [2.3.5] – 2026-11-18
### Geändert
- **Ausrichtung als ruhiger Block:** oben „Ausrichtung nach Uploads: eher Shorts-Kanal“, darunter der Balken über die volle Breite, darunter die Anteile.

## [2.3.4] – 2026-11-18
### Behoben
- Ausrichtungs-Balken: Bei kleinem Anteil fehlte die Beschriftung einer Seite. Jetzt stehen „Videos X %“ und „Shorts Y %“ immer unter dem Balken.

## [2.3.3] – 2026-11-18
### Geändert
- **Vergleich und Analyse•Studio auf einer Seite:** zwei Reiter im Dashboard, beim Umschalten wechselt nur der Inhalt. Hell/Dunkel, Paper und „Layout anpassen“ gelten für beide; das Studio übernimmt Hintergrund und Karten des Vergleichs.
- Titel „Analyse•Studio“ nach der Logo-Logik: Punkt statt Strich, „Studio“ in Limette.
- Der Kanal-Mix ist nicht mehr auf der Videoseite, nur noch auf Kanalseiten.
- Die alte Adresse `radar-analyse.html` leitet ins Dashboard weiter.

## [2.3.2] – 2026-11-18
### Geändert
- Videoseite in einzeln einklappbare Abschnitte geteilt (Thumbnail, Kennzahlen, Leistung über die Zeit, Formate & Tags); der Zustand bleibt gespeichert.
- Basis jeder Kennzahl in jedem Tab wählbar: Videos, Shorts oder Videos + Shorts – mit Etikett an jedem Infofeld.
- Auswahl (Zeitraum, Kennzahl) sitzt zwischen den Infoboxen und dem Kanal-Mix.
- Ausrichtung als zwei Balken (Videos, Shorts) mit durchgehendem Verlauf.

## [2.3.1] – 2026-11-18
### Geändert
- Kanal-Mix zeigt theoretische ER und Reichweite je Videos, Shorts und gesamt; Übersicht beginnt mit dem Gesamtkanal.
- Ausrichtung als geteilter Balken statt Regler.
- Videoseite: Vergleichsauswahl oben, Thumbnail groß mit Download direkt darunter.

## [2.3.0] – 2026-11-17
### Neu (YouTube)
- **Kanal-Mix: Videos und Shorts** getrennt und zusammen – Uploads pro Woche (kaufmännisch gerundet, „≈ 4“), Ø Länge, Ø Views, Views der Uploads im Zeitraum, Ausrichtung nach Uploads und Views, Wachstumstreiber.
- **Zeitraum 7 Tage** und bei jeder Kennzahl die Veränderung zum gleich langen Zeitraum davor.
- **Platz im Kanal** unter den Videos und zusätzlich inklusive Shorts.
- **Kanal-Views im Zeitraum** aus einem eigenen Kanal-Verlauf.
- **Video-Tracking** *(in Entwicklung)*: markierte Videos (höchstens 20) gemessen nach 1, 4, 8, 12 und 24 Stunden sowie 2 und 7 Tagen.
### Geändert
- **Festes API-Budget:** Automatische Abrufe verbrauchen höchstens 2.000 Einheiten am Tag und nie mehr als 80 % des Kontingents; Verbrauchsanzeige in den Einstellungen.
- Automatisches Nachladen nur noch **einmal täglich und sparsam** (Kanal + neueste 50 Videos und Shorts).

## [2.2.0] – 2026-11-17
### Neu (YouTube, in Entwicklung)
- **Leiste rechts:** Auf der Videoseite sitzt das Radar jetzt rechts über den Videovorschlägen, kompakt untereinander.
- **Leistung über die Zeit:** Views pro Stunde seit Upload und zwischen zwei Messungen, Verlaufskurve, Zahl der Messpunkte.
- **Thumbnail-Wechsel erkennen:** jede gesehene Version mit Zeitpunkt und Views pro Stunde; ehrlicher Hinweis zu A/B-Tests.
- **Thumbnails:** Download in voller Auflösung an jeder Karte und auf der Videoseite; echte Thumbnails im Ausreißer-Feed des Studios.
- **Automatisch nachladen – nur auf Wunsch:** ausgewählte gespeicherte YouTube-Kanäle (höchstens 10, frühestens stündlich) mit Kontingent-Schätzung; läuft nur bei geöffnetem Chrome.
### Sicherheit
- Links aus Plattform-Daten werden nur noch als `https://` übernommen.
### Geändert
- Neue Verbindung zu `i.ytimg.com` (YouTube-Thumbnails); neue Berechtigungen `alarms` und `unlimitedStorage`.

## [2.1.0] – 2026-11-17
### Neu
- **Datenfeld im Portfolio:** Beim Überfahren, Antippen oder Anfokussieren eines Kanals öffnet sich neben der Matrix ein Steckbrief – aktuelle Kennzahlen, Status (lebendig, ruhig, eingeschlafen, inaktiv; im Aufwind, stabil, verliert an Views) und bei einem Feldwechsel der Vorher-Nachher-Vergleich zu vor vier Wochen.
- GitHub-Dokumentation: README, Kennzahlen, Architektur, Datenschutz, Changelog.

## [2.0.0] – 2026-11-15
### Neu
- **Analyse-Studio** als eigene Seite im HandKess-Stil: Portfolio, Du gegen die Gruppe (Netzdiagramm), Diagramm-Baukasten mit speicherbaren Ansichten, Formate-Heatmap, Posting-Zeiten-Heatmap, Ausreißer-Feed; PNG-Export jeder Grafik.
- Feld-Symbole im Pinselstil (Stern, Fragezeichen, Kuh, Hund), Kanäle als geschnittene Sticker, Bewegung als Pinselpfeile, Pfeile ausblendbar.
### Geändert
- Der Portfolio-Reiter im Vergleichs-Dashboard ist ins Studio umgezogen; das Dashboard verlinkt dorthin.

## [1.6.1] – 2026-11-15
- Feld-Symbole im Portfolio, Bewegungspfeil vom Stand vor vier Wochen.

## [1.6.0] – 2026-11-15
- **Portfolio-Analyse nach BCG** je Plattform und Bereich: Stärke und Dynamik als gewichtete Ränge, Mindestgröße vier Kanäle, Herleitung als Tabelle.

## [1.5.2] – 2026-11-13
- Symbol „Kümmel-Stern“ als Icon und im Kopf von Panel, Dashboard und Einstellungen.

## [1.5.1] – 2026-11-13
- HandKess-Branding: Schriftzug, Limette als Akzent, dunkler Modus.

## [1.5.0] – 2026-11-13
- **Views-Schätzung** für Beiträge ohne öffentliche Views (Spanne, Format-Faktor, Selbsttest).

## [1.4.0] – 2026-11-05
- **Kanal-Score mit Ampel** im Vergleich zu Kanälen derselben Plattform.

## [1.3.0] – 2026-11-05
- Entwicklung über die Zeit (Follower und Beiträge), „Mein Kanal“ als Vergleich, wöchentliche Stände.

## [1.2.0] – 2026-11-04
- Dashboard zeigt nur selbst gespeicherte Kanäle, organisiert in eigenen Ordnern.

## [1.1.0] – 2026-11-04
- **Vergleichs-Dashboard** mit Hell/Dunkel, Paper-Look und verstellbaren Kacheln.

## [1.0.0] – 2026-11-04
- Umbenennung in **HandKess Social Radar**; alle vier Plattformen mit vollem Funktionsumfang.

## [0.4.0] – 2026-11-04
- **Facebook:** Seiten und Creator-Profile, Shares, Reels; private Profile gesperrt.

## [0.3.0] – 2026-11-04
- **TikTok:** Rangliste, Shares und Saves, genaue Followerzahl.

## [0.2.0] – 2026-11-03
- **Instagram:** Beiträge und Reels, „Views nachladen“ aus dem Reels-Tab.

## [0.1.0] – 2026-11-03
- **YouTube:** Rangliste über die offizielle Data API, Kanal-Kennzahlen, Overlays, Marker, Format-Hashtags, Leiste am einzelnen Video.
