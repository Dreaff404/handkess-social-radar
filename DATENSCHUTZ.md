# Datenschutz

HandKess Social Radar ist ein persönliches Analyse-Werkzeug. Es ist so gebaut, dass möglichst wenig Daten den eigenen Browser verlassen.

## Was gespeichert wird

- Öffentlich sichtbare Kennzahlen der Kanäle und Beiträge, die du mit dem Radar öffnest (Titel, Datum, Views, Likes, Kommentare, Follower).
- Deine eigenen Eingaben: gespeicherte Kanäle, Ordner, Marker, Format-Hashtags, Einstellungen, dein YouTube-API-Schlüssel.
- Für YouTube-Videos der letzten 30 Tage: Messpunkte (Zeit, Views, Likes, Kommentare) und die gesehenen Thumbnail-Versionen als kleine Bilder.
- Für YouTube-Kanäle, die du öffnest: Gesamt-Views, Abonnenten und Videoanzahl im Zeitverlauf (höchstens ein Punkt je 6 Stunden).
- Für Videos, die du selbst zum Tracking markierst (höchstens 20): Views zu festen Zeitpunkten bis 7 Tage nach Upload.
- Den heutigen API-Verbrauch (nur eine Zahl, damit die Automatik ihr Budget einhält).

Alles liegt ausschließlich in `chrome.storage.local` bzw. `localStorage` deines Browsers. Es gibt keinen Server, kein Konto und keine Synchronisation. Wird die Erweiterung entfernt, löscht Chrome diese Daten.

## Welche Verbindungen es gibt

| Ziel | Wann | Was wird gesendet |
|---|---|---|
| `https://www.googleapis.com/youtube/v3/` | beim Öffnen eines YouTube-Kanals oder -Videos (zwischengespeichert, Standard 6 Stunden) und – nur wenn du es einschaltest – einmal täglich beim Nachladen ausgewählter Kanäle sowie zu den Zeitpunkten getrackter Videos | Kanal-Handle bzw. Video-Kennung und dein API-Schlüssel (im Kopf der Anfrage) |
| `https://i.ytimg.com/` | Anzeige und Download von YouTube-Thumbnails; beim Laden eines Kanals für Videos der letzten 30 Tage, um einen Thumbnail-Wechsel zu erkennen | nur die Video-Kennung in der Bildadresse – kein Schlüssel, keine eigenen Daten |

Sonst nichts: keine Telemetrie, keine Fehlerberichte, keine Analyse-Dienste, keine Schriften oder Bilder von fremden Servern (außer den YouTube-Thumbnails oben). Auf Instagram, TikTok und Facebook stellt die Erweiterung **keine eigenen Anfragen**; sie liest nur, was die geöffnete Seite ohnehin geladen hat.

## Grenzen, die bewusst eingebaut sind

- **Private Facebook-Profile** werden nicht ausgewertet und nicht gespeichert – nur Seiten und Creator-Profile.
- **LinkedIn** wird nicht unterstützt, weil die Plattform auslesende Erweiterungen ausdrücklich untersagt.
- **Kein heimliches Sammeln im Hintergrund** und keine Tricks, um wie ein Mensch zu wirken. Einzige Ausnahme, nur auf Wunsch: das tägliche Nachladen ausgewählter YouTube-Kanäle und das Tracking einzelner Videos über die offizielle Schnittstelle – mit fester Budget-Grenze (höchstens 2.000 Einheiten am Tag, nie über 80 % des Kontingents). „Alle laden“ scrollt nur die geöffnete Seite, solange du zusiehst, und hört auf, wenn die Plattform bremst.

## Hinweis

Die Nutzungsbedingungen der jeweiligen Plattform gelten weiterhin. Die Erweiterung ist für die Analyse öffentlich sichtbarer Zahlen gedacht; für die Einhaltung der Plattformregeln bist du bei der Nutzung selbst verantwortlich.
