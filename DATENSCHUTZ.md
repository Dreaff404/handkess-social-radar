# Datenschutz

HandKess Social Radar ist ein persönliches Analyse-Werkzeug. Es ist so gebaut, dass möglichst wenig Daten den eigenen Browser verlassen.

## Was gespeichert wird

- Öffentlich sichtbare Kennzahlen der Kanäle und Beiträge, die du mit dem Radar öffnest (Titel, Datum, Views, Likes, Kommentare, Follower).
- Deine eigenen Eingaben: gespeicherte Kanäle, Ordner, Marker, Format-Hashtags, Einstellungen, dein YouTube-API-Schlüssel.

Alles liegt ausschließlich in `chrome.storage.local` bzw. `localStorage` deines Browsers. Es gibt keinen Server, kein Konto und keine Synchronisation. Wird die Erweiterung entfernt, löscht Chrome diese Daten.

## Welche Verbindungen es gibt

| Ziel | Wann | Was wird gesendet |
|---|---|---|
| `https://www.googleapis.com/youtube/v3/` | beim Öffnen eines YouTube-Kanals oder -Videos (zwischengespeichert, Standard 6 Stunden) | Kanal-Handle bzw. Video-Kennung und dein API-Schlüssel (im Kopf der Anfrage) |

Sonst nichts: keine Telemetrie, keine Fehlerberichte, keine Analyse-Dienste, keine Schriften oder Bilder von fremden Servern. Auf Instagram, TikTok und Facebook stellt die Erweiterung **keine eigenen Anfragen**; sie liest nur, was die geöffnete Seite ohnehin geladen hat.

## Grenzen, die bewusst eingebaut sind

- **Private Facebook-Profile** werden nicht ausgewertet und nicht gespeichert – nur Seiten und Creator-Profile.
- **LinkedIn** wird nicht unterstützt, weil die Plattform auslesende Erweiterungen ausdrücklich untersagt.
- **Kein automatisches Sammeln im Hintergrund** und keine Tricks, um wie ein Mensch zu wirken. „Alle laden“ scrollt nur die geöffnete Seite, solange du zusiehst, und hört auf, wenn die Plattform bremst.

## Hinweis

Die Nutzungsbedingungen der jeweiligen Plattform gelten weiterhin. Die Erweiterung ist für die Analyse öffentlich sichtbarer Zahlen gedacht; für die Einhaltung der Plattformregeln bist du bei der Nutzung selbst verantwortlich.
