# Kennzahlen und Methodik

Alle Berechnungen stehen in [`kern.js`](../kern.js) (für alle Plattformen gleich) und im Analyse-Studio [`radar-analyse.js`](../radar-analyse.js). Grundsatz: **lieber eine ehrliche Lücke als eine erfundene Zahl** – fehlt ein Wert, wird er als „–“ gezeigt und nicht als 0 gerechnet.

## Beitrag

| Kennzahl | Formel | Hinweis |
|---|---|---|
| **Theoretische Engagement-Rate** | (Likes + Kommentare) ÷ Follower × 100 | „theoretisch“, weil öffentlich nur die Follower bekannt sind, nicht die tatsächlich Erreichten |
| **Reichweite** | Views ÷ Follower × 100 | über 100 % = der Beitrag erreicht mehr Menschen, als der Kanal Follower hat |
| **Views pro Tag** | Views ÷ Tage seit Veröffentlichung (mind. 1) | gleicht das Alter der Beiträge aus |
| **Einordnung** | Rang nach ER im Kanal, Faktor zum Kanal-Schnitt, Views ÷ Median | Leiste am einzelnen Video |

## Video-Verlauf (YouTube, in Entwicklung)

- **Ø Views pro Stunde seit Upload** = Views ÷ Stunden seit Veröffentlichung.
- **Views pro Stunde aktuell** = Zuwachs der Views zwischen den letzten zwei Messpunkten ÷ Stunden dazwischen. Messpunkte entstehen bei jedem Abruf (Öffnen des Kanals oder Nachladen auf Wunsch), höchstens alle 30 Minuten, für Videos der letzten 30 Tage.
- **Thumbnail-Wechsel:** YouTube behält die Bildadresse bei einem Tausch bei. Das Radar holt das Bild deshalb selbst und vergleicht eine Prüfsumme. Je Version werden die Views pro Stunde in ihrer Zeit gezeigt. Das ist ein Hinweis auf einen A/B-Test („Test & Compare“) oder einen bewussten Tausch – welche Varianten YouTube parallel ausspielt, ist öffentlich nicht sichtbar.

## Kanal-Mix: Videos und Shorts (YouTube)

- **Getrennt und zusammen:** Jede Kennzahl gibt es für lange Videos, für Shorts und für beides. Welche Basis eine Zahl hat, steht an jeder Kachel.
- **Uploads pro Woche** = Uploads im Zeitraum ÷ Wochen, kaufmännisch gerundet und als ungefährer Wert gekennzeichnet („≈ 4“, unter 0,5 „< 1“).
- **Ø Länge, Ø Views, theoretische ER, Reichweite, Views der Uploads im Zeitraum** – je mit Veränderung zum gleich langen Zeitraum davor (▲/▼ in Prozent).
- **Ausrichtung** = Anteil der Shorts an den Uploads bzw. an den Views: unter 35 % „eher Video-Kanal“, über 65 % „eher Shorts-Kanal“, dazwischen gemischt.
- **Platz im Kanal** auf der Videoseite: unter den Videos derselben Art und zusätzlich inklusive Shorts.
- **Kanal-Views im Zeitraum** = Zuwachs der Gesamt-Views des Kanals aus dem eigenen Kanal-Verlauf. Der Wert steht erst bereit, wenn der Verlauf den Zeitraum abdeckt – bis dahin zeigt das Radar, seit wann es misst.

## Video-Tracking (YouTube, in Entwicklung)

Markierte Videos werden 1, 4, 8, 12 und 24 Stunden sowie 2 und 7 Tage nach Upload gemessen (Views). Ist Chrome zu einem Zeitpunkt nicht offen, wird die Messung nachgeholt und mit dem tatsächlichen Zeitpunkt gekennzeichnet („erst nach 12 Std.“). Alle fälligen Videos werden gebündelt abgefragt – eine API-Einheit je 50 Videos.

## Kanal

- **Schnittwerte** (Ø Views, Ø ER, Ø Reichweite) über die Beiträge im gewählten Zeitraum.
- **Trend:** Schnitt der letzten 30 Tage gegenüber den 30 Tagen davor (nach Veröffentlichungsdatum).
- **Follower-Wachstum pro Woche** aus wöchentlichen Ständen und Markern (mind. zwei Punkte, mind. sechs Tage auseinander), als geometrisches Mittel.
- **Kanal-Score (Ampel):** je Kennzahl der Anteil der Vergleichskanäle derselben Plattform und desselben Bereichs, die geschlagen werden (Gleichstand zählt halb). Kennzahlen: theoretische ER, Reichweite, ER-Trend, Follower-Wachstum. Score = Schnitt × 100; ab 67 „gut“, bis 33 „schwach“; unter drei Kanälen kein Score.

## Portfolio (BCG-Matrix)

Angelehnt an die Portfolio-Matrix der Boston Consulting Group – übersetzt von Produkten und Märkten auf Kanäle.

| Achse | Bedeutung | Kennzahlen (Gewicht) |
|---|---|---|
| **Stärke** (waagerecht) | Wie gut steht der Kanal heute da? | Ø Views (50 %), theoretische ER (30 %), Reichweite (20 %) – im gewählten Zeitraum |
| **Dynamik** (senkrecht) | Wie stark wächst er gerade? | Views-Trend (50 %), Follower-Wachstum pro Woche (35 %), ER-Trend (15 %) |

- Jede Kennzahl wird zum **Rang innerhalb der Gruppe** (0–100). So erdrückt ein Kanal mit Millionen Views nicht alle anderen, und Kanäle unterschiedlicher Größe bleiben vergleichbar.
- Fehlt eine Kennzahl, verteilt sich ihr Gewicht auf die übrigen.
- **Grenzen:** Stärke bei 50 (Mitte der Gruppe). Bei der Dynamik gilt zusätzlich: **Wer nicht wirklich wächst** (Views-Trend ≤ 0, ersatzweise Follower-Wachstum ≤ 0), landet unter der Linie – auch wenn alle anderen noch stärker schrumpfen.
- **Felder:** ⭐ Star (stark, wachsend) · ❓ Question Mark (wachsend, noch schwächer) · 🐄 Cash Cow (stark, ohne Wachstum) · 🐕 Poor Dog (schwächer, ohne Wachstum).
- **Mindestgröße:** vier Kanäle je Plattform und Bereich.
- **Lesart:** Die Felder beschreiben die Lage im Vergleich zur gewählten Gruppe, nicht den Wert eines Kanals. Ein „Poor Dog“ heißt „genauer hinschauen“ – etwa ob ein etablierter Kanal mit stabiler Community bewusst so arbeitet oder eine Weiterentwicklung braucht. Wechselt die Vergleichsgruppe, kann sich das Feld ändern.
- **Bewegung:** Dieselbe Rechnung für den Stand vor 28 Tagen – nur mit Beiträgen, die es damals gab, und der Followerzahl aus dem Wochenstand von damals. Einschränkung: Für ältere Beiträge liefern die Plattformen nur den heutigen View-Stand; das verzerrt alle Kanäle gleich, der Vergleich bleibt fair.
- **Status im Datenfeld:** lebendig (letzter Beitrag ≤ 14 Tage), ruhig (≤ 30), eingeschlafen (≤ 90), inaktiv (> 90); dazu „im Aufwind“ (Views-Trend > +10 %), „stabil“ oder „verliert an Views“ (< −10 %).

## Weitere Module im Analyse-Studio

- **Du gegen die Gruppe:** Rang des eigenen Kanals bei sechs Kennzahlen (Ø Views, theoretische ER, Reichweite, Views-Trend, Follower pro Woche, Posts pro Woche); die Mitte der Gruppe ist Rang 50.
- **Formate:** Ø Interaktionen je View (ohne öffentliche Views: je Follower) pro Kanal und Format-Hashtag; die acht häufigsten Formate der Gruppe.
- **Posting-Zeiten:** dieselbe Quote nach Wochentag und Zeitfenster in Ortszeit; „bestes Fenster“ erst ab zwei Beiträgen.
- **Ausreißer:** Beiträge der letzten 30 Tage mit mindestens dem 1,8-Fachen des Kanal-Medians der letzten 90 Tage.

## Views-Schätzung

Instagram-Bilder und -Karussells sowie Facebook-Fotos zeigen keine Views. Das Radar schätzt sie aus dem Kanal selbst:

1. Aus den Beiträgen **mit** Views (vor allem Reels) wird gelernt, wie viele Interaktionen auf einen View kommen.
2. Geschätzte Views ≈ Interaktionen ÷ diese Quote, korrigiert um einen Format-Faktor (Bild 1,5, Karussell 1,4 – Feed-Beiträge erreichen eher Follower, die häufiger interagieren).
3. Die **Spanne** reicht vom 15. bis zum 85. Perzentil der Quoten.
4. Ein **Selbsttest** schätzt jedes Reel einmal aus den übrigen und zählt, wie oft der echte Wert in der Spanne lag.

Geschätzte Werte erscheinen immer als „≈ 12–20 Tsd. (geschätzt)“ und fließen in keinen Schnitt, keine Sortierung und keinen Score ein.
