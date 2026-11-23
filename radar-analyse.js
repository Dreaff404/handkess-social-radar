// Eingebettet im Vergleichs-Dashboard (v2.3.3): gekapselt, damit sich die Namen nicht mit radar-dashboard.js überschneiden.
(() => {
// HandKess Social Radar – Analyse-Studio (M6, v2.0, André 2026-11-15).
// Eigene Seite neben dem Vergleichs-Dashboard. Rechnet nur mit den selbst gespeicherten Profilen aus dem lokalen Speicher,
// immer innerhalb einer Gruppe = Plattform + Bereich (Views sind zwischen Plattformen und Bereichen nicht vergleichbar).
// Module: Portfolio (BCG), Du gegen die Gruppe (Netz), Diagramm-Baukasten, Formate, Posting-Zeiten, Ausreißer. Jede Grafik als PNG.
// Netz: keine eigenen Abrufe außer YouTube-Thumbnails von i.ytimg.com (v2.2, André-Freigabe); Bilder anderer Plattformen werden nicht geladen.
const K = RadarKern;
const PLATTFORMEN = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };
const BEREICH = { videos: "Videos", shorts: "Shorts", beitraege: "Beiträge", reels: "Reels" };
const ZEITRAUM = [[7, "7 T"], [30, "30 T"], [60, "60 T"], [90, "90 T"], [365, "1 Jahr"], [0, "Alle"]];
const TAG_MS = 864e5, BEWEGUNG_TAGE = 28;
const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
const merke = (k, v) => { try { localStorage.setItem(k, v); } catch { } };
const lies = k => { try { return localStorage.getItem(k); } catch { return null; } };
const pz = (n, v = false) => n == null || !isFinite(n) ? "–" : (v && n > 0 ? "+" : "") + (Math.abs(n) < 10 ? Math.round(n * 10) / 10 : Math.round(n)).toLocaleString("de-DE") + " %";
const dez = n => n == null ? "–" : (Math.round(n * 10) / 10).toLocaleString("de-DE");
const schnitt = l => l.length ? l.reduce((s, x) => s + x, 0) / l.length : null;
const FELD = { star: "Star", frage: "Question Mark", cash: "Cash Cow", dog: "Poor Dog", offen: "Zu wenig Daten" };

// Feld-Symbole im HandKess-Stil (gemalte Pinselzüge, André-Wahl 2026-11-15: Kuh „Hörner & Nüstern“, Hund „Profil mit Schlappohr“)
const SYMBOL = {"star": "<path d=\"M60.8 23.1 L61.0 23.7 L61.2 24.4 L61.4 25.3 L61.6 26.3 L61.8 27.4 L62.1 28.6 L62.3 29.9 L62.6 31.3 L62.9 32.7 L63.1 34.2 L63.5 35.7 L63.8 37.3 L64.1 38.9 L64.5 40.5 L65.0 42.1 L65.4 43.6 L65.9 45.2 L66.5 46.7 L67.1 48.2 L67.8 49.7 L68.7 51.1 L69.6 52.5 L70.7 53.8 L72.0 55.1 L73.6 56.2 L75.3 57.0 L77.1 57.7 L78.9 58.1 L80.7 58.5 L82.5 58.7 L84.3 58.8 L86.1 58.9 L88.0 58.9 L89.8 58.8 L91.6 58.8 L93.3 58.7 L95.0 58.5 L96.6 58.4 L98.1 58.3 L99.5 58.2 L100.7 58.2 L101.7 58.1 L102.5 58.1 L103.0 58.1 L103.0 58.1 L102.4 57.8 L101.0 56.8 L99.6 54.4 L99.4 51.7 L100.0 50.1 L100.5 49.7 L100.5 49.8 L100.1 50.2 L99.5 50.7 L98.7 51.4 L97.7 52.1 L96.5 52.9 L95.3 53.8 L94.0 54.7 L92.6 55.7 L91.2 56.6 L89.7 57.7 L88.3 58.7 L86.9 59.8 L85.5 61.0 L84.1 62.2 L82.9 63.4 L81.7 64.6 L80.6 66.0 L79.6 67.4 L78.8 69.0 L78.3 70.6 L78.0 72.4 L77.9 74.1 L78.1 75.7 L78.4 77.3 L78.8 79.0 L79.3 80.6 L79.9 82.2 L80.5 83.8 L81.2 85.5 L81.9 87.1 L82.6 88.7 L83.3 90.2 L84.0 91.7 L84.6 93.2 L85.2 94.6 L85.8 95.9 L86.3 97.1 L86.7 98.2 L87.0 99.1 L87.1 99.9 L87.1 100.3 L87.1 100.4 L87.2 99.8 L87.9 98.9 L89.0 98.4 L89.6 98.3 L89.7 98.2 L89.4 98.0 L88.8 97.5 L88.1 96.8 L87.3 96.0 L86.4 95.1 L85.4 94.1 L84.4 93.0 L83.3 91.8 L82.1 90.6 L80.9 89.4 L79.6 88.1 L78.4 86.9 L77.0 85.7 L75.7 84.5 L74.3 83.3 L72.8 82.3 L71.3 81.3 L69.7 80.4 L68.0 79.6 L66.1 79.1 L64.0 78.8 L61.9 78.8 L59.9 79.2 L58.0 79.8 L56.3 80.5 L54.6 81.3 L53.0 82.2 L51.4 83.3 L49.9 84.3 L48.4 85.4 L47.0 86.6 L45.6 87.7 L44.3 88.8 L43.0 89.9 L41.8 91.0 L40.7 92.0 L39.7 92.9 L38.8 93.7 L38.0 94.4 L37.4 94.9 L37.0 95.2 L37.1 95.3 L37.7 95.2 L39.5 95.2 L42.0 96.3 L43.6 98.4 L44.0 100.0 L43.9 100.6 L43.8 100.5 L43.8 100.0 L44.0 99.1 L44.2 98.1 L44.6 96.9 L45.0 95.5 L45.5 94.1 L46.0 92.6 L46.5 91.0 L47.1 89.3 L47.6 87.7 L48.2 86.0 L48.7 84.2 L49.1 82.5 L49.5 80.8 L49.8 79.1 L50.0 77.4 L50.2 75.7 L50.1 74.1 L49.9 72.4 L49.4 70.7 L48.7 69.2 L47.8 67.8 L46.7 66.6 L45.6 65.4 L44.3 64.3 L43.0 63.2 L41.6 62.2 L40.2 61.2 L38.7 60.3 L37.3 59.3 L35.8 58.4 L34.3 57.5 L32.9 56.6 L31.5 55.8 L30.3 55.0 L29.1 54.2 L28.0 53.4 L27.1 52.7 L26.4 52.1 L25.9 51.6 L25.7 51.3 L25.8 51.4 L26.2 52.1 L26.2 53.7 L25.4 55.2 L24.7 55.8 L24.5 56.0 L24.8 56.1 L25.4 56.1 L26.3 56.3 L27.4 56.4 L28.7 56.6 L30.0 56.9 L31.5 57.1 L33.1 57.4 L34.8 57.6 L36.5 57.9 L38.3 58.1 L40.1 58.3 L41.9 58.5 L43.7 58.6 L45.5 58.6 L47.3 58.6 L49.2 58.4 L51.0 58.1 L52.9 57.6 L54.7 56.9 L56.5 55.8 L58.1 54.5 L59.4 53.2 L60.5 51.7 L61.5 50.2 L62.3 48.6 L63.0 47.0 L63.7 45.4 L64.2 43.8 L64.8 42.1 L65.2 40.4 L65.6 38.8 L66.0 37.1 L66.4 35.5 L66.7 34.0 L66.9 32.5 L67.2 31.0 L67.4 29.7 L67.6 28.5 L67.8 27.4 L68.0 26.4 L68.1 25.7 L68.2 25.1 L68.1 24.9 L67.9 25.1 L67.4 25.4 L66.3 25.9 L64.5 26.1 L63.0 25.5 L62.2 24.8 L62.0 24.4 L62.0 24.2 L62.2 24.3 L62.4 24.6 L62.6 25.0 L62.8 25.5 L63.1 26.0 L63.3 26.6 L63.5 27.2 L63.6 27.9 L63.8 28.5 L64.0 29.2 L64.1 29.8 L64.3 30.4 L64.4 31.0 L64.5 31.6 L64.6 32.1 L64.8 32.6 L64.9 33.0 L70.9 31.1 L70.9 30.9 L70.8 30.7 L70.8 30.4 L70.7 29.9 L70.7 29.4 L70.6 28.8 L70.6 28.1 L70.5 27.4 L70.5 26.7 L70.4 26.0 L70.3 25.2 L70.3 24.4 L70.2 23.7 L70.1 22.9 L69.9 22.1 L69.8 21.4 L69.5 20.6 L69.2 19.7 L68.5 18.7 L67.3 17.6 L65.2 16.9 L62.9 17.1 L61.2 17.9 L60.1 18.9 L59.2 20.0 L58.6 21.1 L58.1 22.2 L57.6 23.3 L57.2 24.4 L56.7 25.7 L56.3 27.0 L55.9 28.3 L55.5 29.7 L55.0 31.1 L54.6 32.6 L54.2 34.0 L53.7 35.5 L53.3 36.9 L52.8 38.2 L52.3 39.5 L51.8 40.8 L51.3 41.9 L50.8 42.9 L50.4 43.7 L49.9 44.4 L49.5 45.0 L49.2 45.3 L49.1 45.4 L49.0 45.5 L48.7 45.7 L48.1 45.9 L47.3 46.1 L46.2 46.3 L45.0 46.5 L43.7 46.6 L42.2 46.6 L40.7 46.6 L39.1 46.6 L37.5 46.6 L35.8 46.5 L34.2 46.5 L32.6 46.4 L31.0 46.4 L29.5 46.4 L28.0 46.4 L26.6 46.4 L25.2 46.5 L23.9 46.7 L22.5 47.0 L21.0 47.6 L19.4 48.9 L18.1 51.1 L18.0 53.6 L18.8 55.4 L19.8 56.5 L20.8 57.4 L21.8 58.1 L22.9 58.8 L24.1 59.5 L25.4 60.2 L26.7 61.0 L28.1 61.7 L29.5 62.5 L30.9 63.3 L32.3 64.1 L33.7 65.0 L35.1 65.8 L36.5 66.7 L37.7 67.6 L38.8 68.5 L39.9 69.4 L40.8 70.3 L41.5 71.1 L42.0 71.8 L42.3 72.5 L42.4 73.0 L42.5 73.5 L42.4 74.2 L42.3 75.1 L42.1 76.1 L41.8 77.3 L41.3 78.5 L40.8 79.8 L40.2 81.2 L39.5 82.6 L38.8 84.1 L38.1 85.5 L37.3 87.0 L36.5 88.4 L35.7 89.9 L35.0 91.2 L34.3 92.6 L33.6 93.9 L33.0 95.2 L32.4 96.5 L31.9 97.9 L31.5 99.4 L31.4 101.4 L32.1 104.0 L34.3 106.9 L37.7 108.3 L40.5 108.3 L42.5 107.7 L44.0 107.0 L45.3 106.3 L46.5 105.4 L47.6 104.6 L48.8 103.6 L50.0 102.6 L51.2 101.6 L52.4 100.5 L53.6 99.4 L54.8 98.3 L56.0 97.3 L57.2 96.2 L58.4 95.3 L59.5 94.4 L60.5 93.6 L61.5 92.9 L62.3 92.3 L63.0 91.8 L63.6 91.5 L63.9 91.4 L64.0 91.2 L64.1 91.1 L64.5 91.1 L65.2 91.2 L66.1 91.5 L67.1 91.9 L68.2 92.5 L69.4 93.1 L70.7 93.9 L72.0 94.8 L73.3 95.7 L74.6 96.6 L76.0 97.6 L77.3 98.6 L78.6 99.6 L79.8 100.5 L81.1 101.4 L82.2 102.2 L83.4 103.0 L84.5 103.7 L85.6 104.3 L86.8 104.8 L88.2 105.1 L89.9 105.1 L91.8 104.3 L93.1 102.7 L93.5 101.0 L93.4 99.7 L93.2 98.5 L92.8 97.4 L92.4 96.2 L91.9 94.9 L91.4 93.6 L90.8 92.2 L90.2 90.8 L89.6 89.3 L88.9 87.8 L88.3 86.2 L87.7 84.7 L87.2 83.1 L86.7 81.6 L86.2 80.2 L85.9 78.7 L85.6 77.4 L85.5 76.2 L85.4 75.1 L85.5 74.2 L85.7 73.5 L85.9 73.1 L86.2 72.7 L86.6 72.2 L87.2 71.7 L88.0 71.0 L88.9 70.3 L90.0 69.6 L91.2 68.8 L92.5 68.1 L93.9 67.3 L95.3 66.6 L96.7 65.9 L98.2 65.1 L99.7 64.4 L101.1 63.7 L102.5 63.0 L103.9 62.3 L105.2 61.6 L106.5 60.9 L107.7 60.1 L108.9 59.2 L110.1 58.2 L111.3 56.6 L112.3 54.0 L112.1 50.4 L110.2 47.2 L107.9 45.6 L105.9 44.9 L104.3 44.7 L102.8 44.6 L101.4 44.6 L99.9 44.7 L98.4 44.8 L96.9 44.9 L95.3 45.1 L93.7 45.3 L92.1 45.5 L90.5 45.7 L88.9 45.9 L87.3 46.1 L85.8 46.2 L84.3 46.3 L83.0 46.4 L81.8 46.4 L80.7 46.4 L79.8 46.4 L79.1 46.3 L78.6 46.2 L78.3 46.2 L78.0 46.0 L77.4 45.7 L76.9 45.1 L76.3 44.4 L75.6 43.6 L75.0 42.6 L74.4 41.6 L73.8 40.4 L73.2 39.1 L72.6 37.8 L72.1 36.5 L71.5 35.1 L71.1 33.7 L70.6 32.3 L70.2 30.9 L69.8 29.6 L69.4 28.2 L69.0 27.0 L68.7 25.7 L68.4 24.6 L68.1 23.5 L67.8 22.5 L67.5 21.6 L67.2 20.9Z\" fill=\"currentColor\"/><circle cx=\"64.0\" cy=\"22.0\" r=\"3.2\" fill=\"currentColor\"/><circle cx=\"67.9\" cy=\"32.0\" r=\"3.2\" fill=\"currentColor\"/>", "frage": "<path d=\"M44.2 47.0 L44.6 46.5 L44.9 45.9 L45.2 45.2 L45.5 44.5 L45.7 43.8 L46.0 43.0 L46.2 42.2 L46.4 41.4 L46.7 40.6 L46.9 39.8 L47.2 38.9 L47.4 38.1 L47.7 37.3 L48.0 36.5 L48.2 35.7 L48.5 35.0 L48.8 34.3 L49.2 33.7 L49.5 33.1 L49.8 32.7 L50.1 32.3 L50.3 32.1 L50.5 31.9 L50.7 31.8 L51.0 31.6 L51.4 31.4 L51.9 31.1 L52.4 30.8 L52.9 30.5 L53.5 30.2 L54.1 29.9 L54.7 29.6 L55.3 29.4 L56.0 29.1 L56.6 28.8 L57.3 28.6 L58.0 28.4 L58.7 28.2 L59.3 28.0 L60.0 27.9 L60.6 27.7 L61.3 27.6 L61.9 27.5 L62.4 27.5 L63.0 27.4 L63.4 27.4 L63.9 27.5 L64.2 27.5 L64.6 27.5 L65.0 27.6 L65.5 27.7 L66.1 27.8 L66.7 27.9 L67.3 28.1 L67.9 28.2 L68.6 28.4 L69.3 28.6 L70.0 28.9 L70.7 29.1 L71.4 29.4 L72.1 29.6 L72.7 29.9 L73.4 30.2 L74.0 30.5 L74.5 30.8 L75.1 31.1 L75.6 31.3 L76.0 31.6 L76.3 31.8 L76.6 32.0 L76.9 32.1 L77.0 32.2 L77.1 32.2 L77.3 32.3 L77.5 32.4 L77.7 32.6 L77.9 32.9 L78.1 33.2 L78.3 33.5 L78.5 33.9 L78.8 34.4 L79.0 34.8 L79.2 35.3 L79.3 35.8 L79.5 36.4 L79.7 36.9 L79.8 37.4 L79.9 38.0 L80.0 38.5 L80.1 39.1 L80.2 39.6 L80.2 40.1 L80.3 40.6 L80.3 41.1 L80.3 41.5 L80.3 41.8 L80.3 42.1 L80.4 42.3 L80.3 42.6 L80.2 43.0 L80.0 43.5 L79.8 44.0 L79.5 44.5 L79.1 45.0 L78.8 45.6 L78.3 46.2 L77.9 46.8 L77.4 47.4 L76.8 48.0 L76.3 48.6 L75.7 49.3 L75.2 49.9 L74.6 50.5 L74.1 51.1 L73.5 51.8 L72.9 52.4 L72.4 53.0 L71.9 53.6 L71.4 54.3 L71.0 54.9 L70.6 55.3 L70.2 55.6 L69.9 55.9 L69.5 56.2 L69.1 56.5 L68.7 56.7 L68.3 57.0 L67.9 57.3 L67.5 57.5 L67.1 57.8 L66.7 58.0 L66.2 58.3 L65.8 58.6 L65.3 58.9 L64.8 59.3 L64.3 59.7 L63.9 60.1 L63.4 60.5 L62.9 61.0 L62.4 61.5 L62.0 62.1 L61.5 62.7 L61.1 63.4 L60.8 64.1 L60.4 64.9 L60.1 65.7 L59.9 66.5 L59.7 67.3 L59.6 68.0 L59.5 68.8 L59.4 69.6 L59.3 70.4 L59.3 71.2 L59.2 72.0 L59.2 72.7 L59.2 73.5 L59.2 74.2 L59.2 74.9 L59.2 75.6 L59.2 76.3 L59.2 76.9 L59.2 77.5 L59.2 78.0 L59.3 78.5 L59.3 78.9 L59.3 79.3 L59.3 79.5 L59.3 79.8 L68.7 80.2 L68.7 79.8 L68.8 79.3 L68.8 78.8 L68.8 78.3 L68.8 77.8 L68.8 77.2 L68.7 76.6 L68.7 76.0 L68.7 75.4 L68.7 74.8 L68.7 74.2 L68.7 73.5 L68.7 72.9 L68.7 72.3 L68.7 71.7 L68.8 71.1 L68.8 70.5 L68.9 70.0 L68.9 69.5 L69.0 69.0 L69.0 68.7 L69.1 68.3 L69.2 68.1 L69.2 67.9 L69.3 67.7 L69.4 67.6 L69.5 67.4 L69.6 67.3 L69.7 67.1 L69.8 66.9 L70.0 66.8 L70.2 66.6 L70.4 66.4 L70.7 66.1 L70.9 65.9 L71.3 65.7 L71.6 65.4 L72.0 65.1 L72.4 64.8 L72.9 64.5 L73.3 64.2 L73.8 63.8 L74.3 63.4 L74.8 63.0 L75.4 62.6 L75.9 62.1 L76.5 61.6 L77.0 61.1 L77.6 60.8 L78.1 60.5 L78.7 60.1 L79.3 59.7 L80.0 59.3 L80.6 58.9 L81.3 58.4 L82.1 58.0 L82.8 57.5 L83.6 57.0 L84.4 56.4 L85.1 55.8 L85.9 55.3 L86.7 54.6 L87.5 54.0 L88.3 53.3 L89.0 52.6 L89.8 51.9 L90.5 51.1 L91.2 50.2 L91.9 49.3 L92.6 48.3 L93.2 47.3 L93.7 46.2 L94.1 45.1 L94.4 44.1 L94.8 43.1 L95.0 42.1 L95.2 41.1 L95.4 40.0 L95.6 38.9 L95.7 37.9 L95.8 36.8 L95.8 35.7 L95.8 34.5 L95.8 33.4 L95.7 32.3 L95.6 31.2 L95.4 30.0 L95.2 28.9 L94.9 27.7 L94.5 26.6 L94.1 25.4 L93.7 24.3 L93.1 23.2 L92.5 22.0 L91.8 20.9 L91.0 19.8 L90.1 18.8 L89.2 17.9 L88.3 17.0 L87.3 16.2 L86.3 15.5 L85.3 14.7 L84.2 14.1 L83.1 13.4 L82.0 12.8 L80.9 12.3 L79.8 11.7 L78.6 11.2 L77.4 10.8 L76.2 10.4 L75.0 10.0 L73.8 9.6 L72.6 9.3 L71.4 9.1 L70.1 8.9 L68.9 8.7 L67.6 8.6 L66.3 8.5 L65.1 8.5 L63.8 8.5 L62.5 8.6 L61.2 8.8 L60.0 9.0 L58.8 9.3 L57.6 9.7 L56.4 10.0 L55.3 10.4 L54.2 10.9 L53.0 11.4 L52.0 11.9 L50.9 12.4 L49.8 13.0 L48.8 13.6 L47.8 14.3 L46.8 14.9 L45.9 15.6 L44.9 16.3 L44.0 17.1 L43.1 17.8 L42.3 18.6 L41.5 19.5 L40.7 20.3 L40.0 21.2 L39.3 22.2 L38.5 23.3 L37.8 24.5 L37.3 25.7 L36.8 26.9 L36.4 28.1 L36.1 29.3 L35.9 30.5 L35.7 31.6 L35.5 32.7 L35.4 33.8 L35.3 34.9 L35.2 36.0 L35.2 37.1 L35.1 38.1 L35.1 39.0 L35.1 40.0 L35.1 40.9 L35.2 41.7 L35.2 42.4 L35.3 43.1 L35.4 43.7 L35.5 44.2 L35.6 44.6 L35.8 45.0Z\" fill=\"currentColor\"/><circle cx=\"40.0\" cy=\"46.0\" r=\"4.5\" fill=\"currentColor\"/><circle cx=\"64.0\" cy=\"80.0\" r=\"4.5\" fill=\"currentColor\"/><path d=\"M60.3 94.7 L60.2 94.9 L60.2 95.1 L60.1 95.3 L60.0 95.6 L59.9 95.8 L59.8 96.1 L59.7 96.3 L59.5 96.6 L59.4 96.9 L59.3 97.1 L59.2 97.4 L59.1 97.6 L59.1 97.9 L59.0 98.1 L58.9 98.4 L58.9 98.6 L58.9 98.8 L58.9 99.0 L58.9 99.2 L58.9 99.4 L58.8 99.6 L58.8 99.7 L58.8 99.9 L58.8 100.0 L58.7 100.1 L58.7 100.3 L58.6 100.5 L58.5 100.8 L58.3 101.0 L58.1 101.3 L57.9 101.6 L57.7 101.9 L57.5 102.2 L57.2 102.6 L57.0 102.9 L56.7 103.2 L56.5 103.5 L56.2 103.9 L56.0 104.2 L55.8 104.5 L55.6 104.8 L55.5 105.1 L55.4 105.4 L55.3 105.7 L55.2 106.0 L55.2 106.3 L55.1 106.6 L55.1 106.8 L72.9 109.2 L72.9 109.1 L73.0 108.9 L73.0 108.7 L73.0 108.5 L73.0 108.2 L73.0 107.9 L72.9 107.6 L72.9 107.2 L72.8 106.8 L72.7 106.4 L72.6 106.0 L72.4 105.5 L72.3 105.1 L72.1 104.6 L72.0 104.2 L71.9 103.7 L71.7 103.2 L71.6 102.8 L71.5 102.3 L71.4 101.8 L71.4 101.4 L71.3 100.9 L71.3 100.5 L71.2 100.0 L71.2 99.5 L71.1 99.1 L71.1 98.6 L71.0 98.2 L71.0 97.8 L70.9 97.4 L70.8 97.0 L70.6 96.7 L70.5 96.3 L70.4 96.0 L70.2 95.7 L70.0 95.4 L69.8 95.1 L69.6 94.8 L69.3 94.6 L69.1 94.4 L68.9 94.2 L68.7 94.0 L68.5 93.8 L68.3 93.7 L68.1 93.6 L68.0 93.5 L67.8 93.4 L67.7 93.3Z\" fill=\"currentColor\"/><circle cx=\"64.0\" cy=\"108.0\" r=\"9.0\" fill=\"currentColor\"/>", "cash": "<path d=\"M50.1 56.4 L49.8 56.1 L49.5 55.7 L49.2 55.3 L48.8 54.9 L48.4 54.4 L48.0 53.9 L47.6 53.3 L47.1 52.8 L46.7 52.2 L46.3 51.6 L45.8 51.0 L45.4 50.3 L45.0 49.6 L44.6 48.9 L44.2 48.2 L43.9 47.5 L43.5 46.8 L43.2 46.1 L43.0 45.4 L42.8 44.7 L42.6 44.1 L42.4 43.5 L42.3 42.9 L42.3 42.4 L42.2 41.9 L42.2 41.3 L42.1 40.7 L42.1 40.0 L42.0 39.3 L42.0 38.6 L42.0 37.8 L41.9 37.0 L41.9 36.2 L41.9 35.4 L42.0 34.6 L42.0 33.8 L42.1 33.0 L42.2 32.2 L42.3 31.4 L42.5 30.6 L42.7 29.8 L42.9 29.1 L43.1 28.4 L43.3 27.7 L43.6 27.1 L43.8 26.4 L44.1 25.8 L44.3 25.2 L27.7 26.8 L28.0 27.1 L28.3 27.4 L28.6 27.8 L28.9 28.3 L29.2 28.9 L29.5 29.6 L29.7 30.3 L30.0 31.0 L30.2 31.8 L30.4 32.7 L30.6 33.6 L30.7 34.5 L30.9 35.4 L31.1 36.3 L31.2 37.3 L31.4 38.2 L31.6 39.2 L31.8 40.1 L32.0 41.1 L32.3 42.0 L32.6 42.9 L32.9 43.9 L33.3 44.7 L33.7 45.6 L34.2 46.4 L34.7 47.2 L35.3 48.0 L35.9 48.7 L36.5 49.4 L37.1 50.1 L37.7 50.8 L38.4 51.4 L39.0 52.1 L39.6 52.7 L40.2 53.3 L40.8 54.0 L41.4 54.6 L42.0 55.1 L42.6 55.7 L43.1 56.2 L43.6 56.8 L44.0 57.3 L44.5 57.8 L44.8 58.2 L45.2 58.6 L45.5 59.0 L45.7 59.3 L45.9 59.6Z\" fill=\"currentColor\"/><circle cx=\"48.0\" cy=\"58.0\" r=\"2.5\" fill=\"currentColor\"/><circle cx=\"36.0\" cy=\"26.0\" r=\"8.0\" fill=\"currentColor\"/><path d=\"M81.9 59.4 L82.1 59.1 L82.4 58.8 L82.7 58.5 L83.1 58.1 L83.5 57.7 L83.9 57.2 L84.4 56.8 L85.0 56.3 L85.5 55.8 L86.1 55.2 L86.7 54.7 L87.3 54.1 L88.0 53.5 L88.6 52.9 L89.2 52.3 L89.9 51.6 L90.5 50.9 L91.1 50.2 L91.6 49.5 L92.2 48.8 L92.7 48.0 L93.2 47.2 L93.6 46.4 L94.1 45.5 L94.4 44.7 L94.8 43.8 L95.1 42.9 L95.3 41.9 L95.6 41.0 L95.9 40.1 L96.1 39.1 L96.4 38.2 L96.6 37.2 L96.9 36.3 L97.1 35.4 L97.4 34.5 L97.7 33.6 L98.0 32.7 L98.3 31.9 L98.5 31.1 L98.8 30.3 L99.1 29.6 L99.3 28.9 L99.6 28.3 L99.8 27.8 L100.0 27.4 L100.2 27.1 L100.3 26.8 L83.7 25.2 L83.8 25.7 L83.9 26.4 L84.0 27.0 L84.2 27.7 L84.4 28.4 L84.6 29.1 L84.8 29.8 L85.0 30.6 L85.2 31.3 L85.4 32.1 L85.6 33.0 L85.8 33.8 L86.0 34.6 L86.1 35.4 L86.2 36.3 L86.3 37.1 L86.4 37.9 L86.4 38.6 L86.3 39.4 L86.3 40.1 L86.2 40.8 L86.1 41.4 L86.0 42.0 L85.9 42.5 L85.8 43.0 L85.6 43.5 L85.4 44.1 L85.2 44.7 L84.9 45.3 L84.6 46.0 L84.3 46.7 L83.9 47.4 L83.6 48.1 L83.2 48.8 L82.8 49.5 L82.4 50.2 L82.0 50.8 L81.6 51.5 L81.2 52.1 L80.8 52.8 L80.4 53.4 L80.0 53.9 L79.7 54.4 L79.3 54.9 L79.0 55.4 L78.6 55.8 L78.3 56.2 L78.1 56.6Z\" fill=\"currentColor\"/><circle cx=\"80.0\" cy=\"58.0\" r=\"2.5\" fill=\"currentColor\"/><circle cx=\"92.0\" cy=\"26.0\" r=\"8.0\" fill=\"currentColor\"/><path d=\"M64.0 63.1 L65.2 63.1 L66.4 63.2 L67.6 63.3 L68.8 63.4 L70.1 63.4 L71.3 63.5 L72.6 63.6 L73.8 63.7 L75.1 63.9 L76.3 64.0 L77.5 64.2 L78.7 64.3 L79.8 64.5 L80.9 64.7 L82.0 64.9 L83.0 65.1 L84.0 65.4 L84.9 65.6 L85.7 65.9 L86.4 66.2 L87.1 66.5 L87.6 66.8 L88.1 67.0 L88.5 67.3 L88.8 67.6 L89.2 67.9 L89.5 68.3 L89.9 68.7 L90.3 69.2 L90.6 69.7 L91.0 70.2 L91.3 70.8 L91.7 71.4 L92.0 72.0 L92.3 72.7 L92.6 73.4 L92.8 74.1 L93.0 74.8 L93.2 75.5 L93.4 76.2 L93.6 76.9 L93.7 77.6 L93.8 78.2 L93.9 78.9 L93.9 79.5 L94.0 80.0 L94.0 80.6 L93.9 81.0 L93.9 81.4 L93.8 81.9 L93.7 82.4 L93.5 83.0 L93.3 83.6 L93.0 84.3 L92.7 85.0 L92.4 85.7 L92.0 86.4 L91.5 87.1 L91.1 87.9 L90.6 88.6 L90.0 89.3 L89.5 90.0 L88.9 90.8 L88.3 91.4 L87.7 92.1 L87.1 92.7 L86.5 93.3 L85.9 93.9 L85.3 94.5 L84.7 94.9 L84.1 95.4 L83.6 95.8 L83.0 96.1 L82.5 96.5 L81.9 96.8 L81.3 97.0 L80.6 97.3 L79.9 97.5 L79.2 97.7 L78.5 97.9 L77.7 98.1 L76.9 98.3 L76.0 98.4 L75.1 98.5 L74.3 98.6 L73.4 98.7 L72.5 98.8 L71.5 98.8 L70.6 98.9 L69.7 98.9 L68.7 99.0 L67.8 99.0 L66.8 99.0 L65.9 99.0 L64.9 99.0 L64.0 99.0 L63.1 99.1 L62.1 99.1 L61.2 99.1 L60.2 99.1 L59.3 99.1 L58.3 99.2 L57.4 99.2 L56.5 99.1 L55.5 99.1 L54.6 99.1 L53.7 99.0 L52.8 99.0 L51.9 98.9 L51.1 98.8 L50.2 98.7 L49.4 98.5 L48.7 98.3 L47.9 98.1 L47.2 97.9 L46.5 97.7 L45.8 97.4 L45.2 97.2 L44.6 96.8 L44.0 96.5 L43.4 96.1 L42.8 95.7 L42.2 95.2 L41.5 94.6 L40.9 94.1 L40.2 93.5 L39.6 92.8 L39.0 92.2 L38.3 91.5 L37.7 90.8 L37.1 90.0 L36.6 89.3 L36.0 88.5 L35.5 87.8 L35.1 87.0 L34.6 86.3 L34.3 85.6 L33.9 84.8 L33.6 84.1 L33.4 83.5 L33.2 82.8 L33.0 82.2 L32.9 81.7 L32.9 81.2 L32.8 80.7 L32.8 80.1 L32.9 79.5 L32.9 78.8 L33.0 78.1 L33.1 77.4 L33.2 76.7 L33.4 75.9 L33.6 75.2 L33.9 74.5 L34.1 73.7 L34.4 73.0 L34.7 72.3 L35.1 71.6 L35.4 70.9 L35.8 70.3 L36.2 69.7 L36.6 69.1 L37.0 68.6 L37.4 68.1 L37.9 67.7 L38.3 67.3 L38.7 67.0 L39.1 66.7 L39.6 66.5 L40.1 66.2 L40.7 66.0 L41.4 65.7 L42.2 65.5 L43.0 65.3 L44.0 65.0 L44.9 64.9 L46.0 64.7 L47.0 64.5 L48.2 64.4 L49.3 64.3 L50.5 64.2 L51.7 64.1 L52.9 64.0 L54.2 64.0 L55.4 63.9 L56.7 63.9 L57.9 63.9 L59.2 63.8 L60.4 63.8 L61.6 63.8 L62.8 63.8Z M64.0 52.9 L65.2 52.9 L66.4 52.8 L67.7 52.7 L69.0 52.7 L70.3 52.6 L71.6 52.6 L73.0 52.6 L74.3 52.6 L75.7 52.6 L77.1 52.6 L78.4 52.6 L79.8 52.7 L81.2 52.8 L82.6 52.9 L83.9 53.0 L85.3 53.2 L86.6 53.5 L87.9 53.7 L89.3 54.0 L90.6 54.4 L91.8 54.9 L93.1 55.4 L94.3 56.0 L95.5 56.7 L96.7 57.5 L97.7 58.3 L98.7 59.2 L99.6 60.2 L100.4 61.1 L101.2 62.2 L101.9 63.2 L102.6 64.3 L103.2 65.4 L103.7 66.6 L104.2 67.7 L104.7 68.9 L105.1 70.0 L105.4 71.2 L105.7 72.4 L106.0 73.6 L106.2 74.8 L106.3 76.0 L106.4 77.2 L106.5 78.3 L106.4 79.5 L106.4 80.7 L106.3 81.8 L106.1 83.0 L105.8 84.2 L105.4 85.3 L105.0 86.5 L104.5 87.6 L104.0 88.6 L103.4 89.7 L102.8 90.7 L102.2 91.7 L101.5 92.7 L100.7 93.7 L100.0 94.6 L99.2 95.5 L98.4 96.4 L97.5 97.3 L96.7 98.1 L95.8 98.9 L94.9 99.7 L94.0 100.5 L93.1 101.2 L92.2 101.9 L91.3 102.5 L90.3 103.1 L89.4 103.7 L88.4 104.2 L87.4 104.7 L86.4 105.1 L85.3 105.5 L84.3 105.8 L83.2 106.1 L82.2 106.4 L81.1 106.6 L80.1 106.7 L79.0 106.9 L77.9 107.0 L76.9 107.0 L75.9 107.1 L74.8 107.1 L73.8 107.2 L72.7 107.2 L71.7 107.2 L70.7 107.1 L69.7 107.1 L68.7 107.1 L67.7 107.1 L66.8 107.0 L65.8 107.0 L64.9 107.0 L64.0 107.0 L63.1 106.9 L62.2 106.9 L61.2 106.9 L60.3 106.9 L59.3 106.9 L58.3 106.9 L57.3 106.9 L56.3 106.9 L55.3 106.8 L54.2 106.8 L53.2 106.7 L52.2 106.7 L51.2 106.6 L50.1 106.5 L49.1 106.3 L48.0 106.2 L47.0 106.0 L46.0 105.7 L45.0 105.5 L43.9 105.2 L42.9 104.8 L41.9 104.4 L40.9 104.0 L40.0 103.5 L39.1 103.0 L38.2 102.4 L37.3 101.8 L36.4 101.1 L35.5 100.5 L34.6 99.7 L33.8 99.0 L32.9 98.2 L32.1 97.4 L31.2 96.6 L30.4 95.7 L29.7 94.8 L28.9 93.9 L28.2 93.0 L27.5 92.1 L26.8 91.1 L26.2 90.1 L25.6 89.1 L25.1 88.1 L24.6 87.1 L24.1 86.1 L23.7 85.0 L23.4 83.9 L23.1 82.8 L23.0 81.7 L22.8 80.6 L22.8 79.5 L22.8 78.4 L22.8 77.3 L22.9 76.1 L23.0 75.0 L23.2 73.8 L23.4 72.7 L23.7 71.5 L24.0 70.4 L24.3 69.3 L24.8 68.1 L25.2 67.0 L25.7 65.9 L26.3 64.8 L26.9 63.8 L27.6 62.7 L28.3 61.7 L29.1 60.7 L29.9 59.8 L30.8 58.9 L31.8 58.1 L32.9 57.3 L34.0 56.6 L35.2 55.9 L36.4 55.4 L37.6 54.9 L38.9 54.5 L40.2 54.1 L41.5 53.8 L42.8 53.5 L44.1 53.3 L45.5 53.1 L46.8 52.9 L48.2 52.7 L49.6 52.6 L50.9 52.5 L52.3 52.4 L53.7 52.3 L55.0 52.3 L56.4 52.2 L57.7 52.2 L59.0 52.2 L60.3 52.2 L61.6 52.2 L62.8 52.2Z\" fill=\"currentColor\" fill-rule=\"evenodd\"/><ellipse cx=\"52\" cy=\"82\" rx=\"6.5\" ry=\"8.5\" fill=\"currentColor\" transform=\"rotate(-18 52 82)\"/><ellipse cx=\"76\" cy=\"82\" rx=\"6.5\" ry=\"8.5\" fill=\"currentColor\" transform=\"rotate(18 76 82)\"/>", "dog": "<path d=\"M41.0 37.6 L41.7 37.7 L42.5 37.6 L43.3 37.5 L44.1 37.3 L45.0 37.0 L46.0 36.8 L47.0 36.5 L48.0 36.2 L49.0 35.9 L50.1 35.6 L51.2 35.3 L52.3 35.0 L53.4 34.7 L54.5 34.4 L55.6 34.1 L56.7 33.9 L57.7 33.7 L58.7 33.5 L59.7 33.4 L60.6 33.3 L61.4 33.2 L62.1 33.2 L62.7 33.3 L63.3 33.3 L63.8 33.5 L64.4 33.6 L64.9 33.8 L65.5 34.0 L66.1 34.3 L66.7 34.6 L67.3 34.9 L68.0 35.3 L68.6 35.8 L69.3 36.2 L70.0 36.7 L70.7 37.2 L71.4 37.8 L72.2 38.4 L72.9 39.0 L73.7 39.6 L74.6 40.3 L75.4 40.9 L76.3 41.6 L77.2 42.3 L78.1 43.0 L79.1 43.6 L80.1 44.3 L81.1 44.9 L82.1 45.6 L83.2 46.2 L84.3 46.8 L85.4 47.4 L86.6 48.0 L87.7 48.6 L88.9 49.2 L90.1 49.8 L91.2 50.4 L92.4 51.0 L93.5 51.6 L94.6 52.2 L95.7 52.8 L96.8 53.4 L97.8 54.0 L98.7 54.5 L99.6 55.1 L100.4 55.6 L101.1 56.2 L101.7 56.6 L102.2 57.1 L102.6 57.5 L102.9 57.8 L103.0 58.0 L103.1 58.1 L103.2 58.3 L103.2 58.5 L103.2 58.6 L103.3 58.8 L103.3 59.0 L103.3 59.1 L103.2 59.3 L103.2 59.5 L103.2 59.7 L103.1 60.0 L103.1 60.2 L103.0 60.5 L102.9 60.7 L102.8 61.0 L102.6 61.3 L102.5 61.5 L102.3 61.8 L102.2 62.0 L102.0 62.3 L101.9 62.5 L101.7 62.6 L101.6 62.8 L101.5 62.8 L101.6 62.8 L101.7 62.7 L101.6 62.8 L101.5 62.8 L101.1 63.0 L100.7 63.1 L100.2 63.2 L99.6 63.4 L99.0 63.5 L98.3 63.7 L97.5 63.8 L96.7 63.9 L95.9 64.0 L95.0 64.2 L94.2 64.3 L93.3 64.4 L92.4 64.6 L91.5 64.7 L90.6 64.9 L89.6 65.1 L88.7 65.3 L87.8 65.5 L86.9 65.8 L86.0 66.2 L85.4 66.4 L85.0 66.6 L84.5 66.8 L84.0 67.0 L83.5 67.2 L83.1 67.4 L82.6 67.7 L82.1 67.9 L81.5 68.1 L81.0 68.4 L80.5 68.7 L79.9 69.0 L79.4 69.3 L78.8 69.7 L78.3 70.1 L77.7 70.5 L77.2 71.0 L76.7 71.5 L76.2 72.1 L75.7 72.6 L75.2 73.2 L74.8 73.8 L74.3 74.5 L73.9 75.2 L73.4 76.0 L72.9 76.8 L72.5 77.7 L72.1 78.7 L71.7 79.6 L71.3 80.6 L70.9 81.6 L70.6 82.6 L70.2 83.7 L69.8 84.7 L69.5 85.8 L69.2 86.9 L68.8 87.9 L68.5 88.9 L68.2 89.9 L68.0 90.9 L67.7 91.8 L67.5 92.7 L67.2 93.6 L67.1 94.3 L66.9 95.1 L66.8 95.7 L66.7 96.2 L66.8 96.8 L73.2 99.2 L73.7 98.8 L74.0 98.3 L74.3 97.7 L74.6 97.0 L75.0 96.2 L75.3 95.4 L75.7 94.6 L76.0 93.7 L76.4 92.8 L76.8 91.8 L77.2 90.9 L77.6 89.9 L78.0 88.9 L78.4 88.0 L78.8 87.0 L79.2 86.1 L79.6 85.2 L80.0 84.4 L80.4 83.6 L80.8 82.8 L81.2 82.2 L81.5 81.6 L81.8 81.2 L82.1 80.8 L82.4 80.5 L82.7 80.2 L83.0 79.9 L83.2 79.7 L83.5 79.5 L83.7 79.4 L83.9 79.3 L84.1 79.2 L84.2 79.2 L84.4 79.1 L84.6 79.1 L84.8 79.0 L85.0 79.0 L85.3 78.9 L85.6 78.8 L85.9 78.8 L86.3 78.7 L86.7 78.6 L87.2 78.5 L87.7 78.4 L88.2 78.3 L88.8 78.1 L89.4 78.0 L90.0 77.8 L90.4 77.8 L90.7 77.7 L91.2 77.7 L91.8 77.6 L92.5 77.5 L93.2 77.5 L93.9 77.4 L94.7 77.4 L95.6 77.3 L96.5 77.2 L97.4 77.2 L98.3 77.1 L99.2 77.0 L100.2 76.9 L101.2 76.8 L102.1 76.6 L103.1 76.4 L104.2 76.2 L105.2 75.9 L106.2 75.6 L107.3 75.2 L108.4 74.6 L109.5 73.9 L110.5 73.2 L111.3 72.4 L111.9 71.7 L112.5 71.0 L113.1 70.2 L113.6 69.4 L114.1 68.6 L114.6 67.8 L115.0 66.9 L115.4 65.9 L115.7 65.0 L116.0 64.0 L116.2 63.0 L116.4 62.0 L116.5 60.9 L116.5 59.9 L116.5 58.8 L116.3 57.6 L116.1 56.5 L115.9 55.4 L115.5 54.3 L115.0 53.2 L114.4 52.1 L113.8 51.1 L113.0 50.0 L112.1 49.1 L111.2 48.2 L110.2 47.4 L109.2 46.6 L108.2 45.9 L107.1 45.3 L106.0 44.6 L104.9 44.0 L103.7 43.4 L102.5 42.7 L101.3 42.1 L100.1 41.5 L98.9 41.0 L97.7 40.4 L96.5 39.8 L95.3 39.2 L94.1 38.7 L92.9 38.1 L91.8 37.6 L90.7 37.1 L89.7 36.5 L88.7 36.0 L87.8 35.5 L86.9 35.1 L86.1 34.6 L85.4 34.1 L84.6 33.6 L83.8 33.1 L83.0 32.5 L82.2 31.9 L81.4 31.3 L80.6 30.7 L79.8 30.1 L79.0 29.5 L78.2 28.9 L77.3 28.3 L76.4 27.6 L75.5 27.0 L74.6 26.4 L73.7 25.9 L72.7 25.3 L71.7 24.8 L70.6 24.3 L69.5 23.8 L68.4 23.5 L67.2 23.1 L66.0 22.9 L64.7 22.7 L63.4 22.6 L62.0 22.5 L60.7 22.6 L59.4 22.8 L58.0 23.0 L56.7 23.2 L55.4 23.6 L54.2 23.9 L52.9 24.3 L51.6 24.7 L50.4 25.1 L49.2 25.5 L48.0 26.0 L46.9 26.4 L45.8 26.9 L44.8 27.3 L43.8 27.8 L42.8 28.2 L42.0 28.6 L41.2 29.0 L40.5 29.4 L39.9 29.7 L39.4 30.0 L39.0 30.4Z\" fill=\"currentColor\"/><circle cx=\"40.0\" cy=\"34.0\" r=\"3.5\" fill=\"currentColor\"/><circle cx=\"70.0\" cy=\"98.0\" r=\"3.5\" fill=\"currentColor\"/><path d=\"M43.5 36.0 L43.2 36.3 L42.9 36.6 L42.5 36.9 L42.1 37.3 L41.6 37.7 L41.1 38.2 L40.5 38.7 L39.9 39.3 L39.2 39.8 L38.6 40.5 L37.9 41.1 L37.2 41.8 L36.5 42.5 L35.8 43.2 L35.0 44.0 L34.3 44.8 L33.6 45.6 L32.9 46.5 L32.2 47.4 L31.5 48.3 L30.9 49.2 L30.2 50.2 L29.6 51.3 L29.1 52.3 L28.6 53.4 L28.1 54.4 L27.7 55.5 L27.2 56.6 L26.8 57.8 L26.4 58.9 L26.0 60.1 L25.6 61.4 L25.3 62.6 L25.0 63.9 L24.7 65.1 L24.4 66.4 L24.1 67.7 L23.9 69.0 L23.7 70.3 L23.5 71.6 L23.4 72.9 L23.3 74.2 L23.2 75.5 L23.2 76.7 L23.2 78.0 L23.3 79.2 L23.4 80.4 L23.5 81.7 L23.8 83.0 L24.1 84.4 L24.5 85.7 L24.9 87.0 L25.4 88.2 L25.9 89.3 L26.5 90.5 L27.0 91.5 L27.6 92.6 L28.1 93.6 L28.7 94.5 L29.2 95.4 L29.7 96.3 L30.2 97.2 L30.7 98.0 L31.1 98.8 L31.4 99.6 L31.7 100.3 L32.0 100.9 L32.1 101.5 L32.2 102.0 L32.2 102.3 L32.0 102.5 L31.9 102.8 L52.1 89.2 L51.5 88.8 L50.8 88.2 L50.1 87.7 L49.4 87.3 L48.7 86.9 L48.1 86.4 L47.5 86.0 L46.9 85.6 L46.2 85.2 L45.7 84.7 L45.1 84.3 L44.5 83.8 L44.0 83.3 L43.5 82.8 L43.0 82.3 L42.6 81.8 L42.2 81.3 L41.8 80.8 L41.5 80.3 L41.2 79.9 L41.0 79.5 L40.8 79.1 L40.6 78.7 L40.5 78.3 L40.3 77.8 L40.2 77.1 L40.0 76.4 L39.8 75.5 L39.7 74.7 L39.6 73.8 L39.4 72.8 L39.3 71.8 L39.2 70.8 L39.1 69.7 L39.0 68.7 L38.9 67.6 L38.8 66.5 L38.7 65.4 L38.7 64.3 L38.6 63.2 L38.6 62.2 L38.6 61.1 L38.6 60.1 L38.7 59.1 L38.7 58.2 L38.8 57.3 L38.8 56.4 L38.9 55.7 L39.0 55.0 L39.1 54.3 L39.3 53.6 L39.6 52.9 L39.9 52.1 L40.3 51.4 L40.7 50.6 L41.1 49.9 L41.6 49.1 L42.0 48.4 L42.6 47.7 L43.1 47.0 L43.6 46.3 L44.1 45.6 L44.7 44.9 L45.2 44.3 L45.7 43.7 L46.2 43.1 L46.6 42.5 L47.1 42.0 L47.5 41.4 L47.9 40.9 L48.2 40.4 L48.5 40.0Z\" fill=\"currentColor\"/><circle cx=\"46.0\" cy=\"38.0\" r=\"3.0\" fill=\"currentColor\"/><circle cx=\"42.0\" cy=\"96.0\" r=\"12.0\" fill=\"currentColor\"/><ellipse cx=\"76\" cy=\"48\" rx=\"4.5\" ry=\"5.5\" fill=\"currentColor\" transform=\"rotate(0 76 48)\"/><ellipse cx=\"108\" cy=\"60\" rx=\"6\" ry=\"5\" fill=\"currentColor\" transform=\"rotate(0 108 60)\"/><path d=\"M84.7 75.0 L84.7 75.3 L84.8 75.6 L84.9 75.9 L85.1 76.2 L85.2 76.6 L85.4 77.0 L85.5 77.4 L85.7 77.9 L85.9 78.4 L86.2 78.8 L86.5 79.2 L86.8 79.6 L87.2 80.0 L87.6 80.4 L87.9 80.7 L88.3 81.1 L88.7 81.4 L89.0 81.7 L89.3 82.0 L89.5 82.3 L89.8 82.6 L90.1 82.8 L90.3 83.0 L90.6 83.0 L93.4 81.0 L93.4 80.7 L93.3 80.4 L93.2 80.1 L93.0 79.7 L92.8 79.4 L92.6 79.0 L92.4 78.6 L92.1 78.2 L91.9 77.7 L91.7 77.3 L91.4 76.8 L91.2 76.4 L90.9 75.9 L90.6 75.5 L90.2 75.2 L89.8 74.8 L89.4 74.5 L89.1 74.2 L88.7 74.0 L88.4 73.7 L88.1 73.5 L87.8 73.3 L87.6 73.1 L87.3 73.0Z\" fill=\"currentColor\"/><circle cx=\"86.0\" cy=\"74.0\" r=\"1.6\" fill=\"currentColor\"/><circle cx=\"92.0\" cy=\"82.0\" r=\"1.6\" fill=\"currentColor\"/>"};
const sym = (f, o = {}) => SYMBOL[f] ? `<svg class="sym ${o.cls || ""}" ${o.x != null ? `x="${o.x}" y="${o.y}"` : ""} width="${o.g || 16}" height="${o.g || 16}" viewBox="0 0 128 128" aria-hidden="true">${SYMBOL[f]}</svg>` : "";
const tip = html => ` data-tip="${esc(html)}"`;

let zustand = { ordner: lies("hsr_studio_ordner") || "alle", gruppe: lies("hsr_studio_gruppe") || "", zeitraum: +(lies("hsr_zeitraum") ?? 90) };
let profile = [], gespeichert = { ordner: [], profile: {} }, tags = {}, modul = "alle";
let bewegungZeigen = lies("hsr_bewegung") !== "0", nurStars = false;
let bau = (() => { try { return { x: "ppw", y: "views", typ: "streu", log: false, ...JSON.parse(lies("hsr_bau") || "{}") }; } catch { return { x: "ppw", y: "views", typ: "streu", log: false }; } })();
let ansichten = [{ name: "Mehr posten = mehr Views?", x: "ppw", y: "views", typ: "streu", log: false }, { name: "ER-Rangliste", x: "ter", y: "ter", typ: "balken", log: false }];

// ---------- Daten aus dem Speicher (wie im Vergleichs-Dashboard) ----------
function urlFuer(p) {
  const h = p.kanal.handle || "";
  if (p.plattform === "youtube") return (h ? "https://www.youtube.com/" + h.replace(/^(?!@)/, "@") : "https://www.youtube.com/channel/" + p.kanal.id) + "/" + (p.bereich === "shorts" ? "shorts" : "videos");
  if (p.plattform === "instagram") return `https://www.instagram.com/${h}/${p.bereich === "reels" ? "reels/" : ""}`;
  if (p.plattform === "tiktok") return `https://www.tiktok.com/@${h}`;
  return `https://www.facebook.com/${h}/${p.bereich === "reels" ? "reels/" : ""}`;
}
async function laden() {
  const alles = await chrome.storage.local.get(null);
  tags = alles.tags || {};
  if (Array.isArray(alles.analyseAnsichten)) ansichten = alles.analyseAnsichten;
  const marker = alles.marker || {}, verlauf = alles.verlauf || {};
  const roh = new Map();
  const nimm = e => { const k = `${e.plattform}:${e.kanal.id}:${e.bereich}`; if (!roh.has(k) || roh.get(k).stand < e.stand) roh.set(k, e); };
  for (const [k, d] of Object.entries(alles)) {
    if (k.startsWith("cache:") && d?.kanal && Array.isArray(d.videos)) nimm({ plattform: "youtube", kanal: d.kanal, bereich: d.bereich, videos: d.videos, stand: d.geladenAm });
    const m = /^(ig|tt|fb):/.exec(k);
    if (m && d?.listen && d?.medien) {
      const plattform = { ig: "instagram", tt: "tiktok", fb: "facebook" }[m[1]];
      for (const [bereich, ids] of Object.entries(d.listen)) {
        const videos = ids.map(id => d.medien[id]).filter(v => v?.datum);
        if (videos.length) nimm({ plattform, kanal: d.kanal, bereich, videos, stand: d.aktualisiert });
      }
    }
  }
  gespeichert = { ordner: [], profile: {}, ...alles.gespeichert };
  if (!["alle", "ohne"].includes(zustand.ordner) && !gespeichert.ordner.some(o => o.id === zustand.ordner)) zustand.ordner = "alle";
  const daten = [...roh.values()];
  profile = Object.entries(gespeichert.profile).flatMap(([schluessel, g]) => daten.filter(d => d.plattform === g.plattform && d.kanal.id === g.kanalId).map(p => ({
    ...p, schluessel, id: schluessel + ":" + p.bereich, ordner: g.ordner || null, mein: !!g.mein, verlauf: verlauf[schluessel] || [],
    markerAlle: marker[`${p.kanal.id}:${p.bereich}`] || [], url: urlFuer(p), name: p.kanal.name || p.kanal.handle || "?"
  })));
  zeichnen();
}

// ---------- Kennzahlen eines Profils zu einem Zeitpunkt ----------
// heute oder vor 4 Wochen: nur Beiträge, die es damals gab, Follower aus dem Wochenstand von damals
// (Views älterer Beiträge = heutiger Stand der Plattform – bei allen Kanälen gleich verzerrt).
function werte(p, jetzt = Date.now()) {
  const punkte = [...p.verlauf, ...p.markerAlle].filter(x => x.zeit <= jetzt && x.follower).sort((a, b) => a.zeit - b.zeit);
  const follower = jetzt >= Date.now() - TAG_MS ? p.kanal.follower : (punkte[punkte.length - 1]?.follower || p.kanal.follower);
  const vids = p.videos.filter(v => v.datum && new Date(v.datum).getTime() <= jetzt).map(v => K.kennzahlen(v, follower, jetzt));
  const tage = zustand.zeitraum || 365;
  const im = K.filtern(vids, { zeitraum: zustand.zeitraum });
  const sum = K.kanalSchnitt(im, follower);
  const views = im.map(v => v.views).filter(v => v != null), m = schnitt(views);
  return {
    vids, im, follower, views: sum.views, ter: sum.ter, reach: sum.reach,
    viewsTrend: K.trend(vids, "views", 30, jetzt).aenderung, terTrend: K.trend(vids, "ter", 30, jetzt).aenderung,
    wachstum: K.wachstumProWoche(punkte),
    ppw: vids.filter(v => v.tage <= tage).length / (tage / 7),
    streuung: views.length > 2 && m ? Math.sqrt(schnitt(views.map(x => (x - m) ** 2))) / m * 100 : null
  };
}

// ---------- Gruppe = Profile im Ordner, je Plattform + Bereich; „Mein Kanal“ der Plattform ist immer dabei ----------
function gruppen() {
  const imOrdner = profile.filter(p => zustand.ordner === "alle" || (zustand.ordner === "ohne" ? !p.ordner : p.ordner === zustand.ordner));
  const g = {};
  imOrdner.forEach(p => (g[p.plattform + ":" + p.bereich] ||= new Map()).set(p.id, p));
  Object.keys(g).forEach(k => profile.filter(p => p.mein && p.plattform + ":" + p.bereich === k).forEach(p => g[k].set(p.id, p)));
  return Object.fromEntries(Object.entries(g).map(([k, m]) => [k, [...m.values()]]));
}
let gruppe = [], heute = [], pfHeute = {}, pfDamals = {}, dein = null;
function rechnen() {
  const alle = gruppen(), schluessel = Object.keys(alle).sort((a, b) => alle[b].length - alle[a].length);
  // Gemerkte Gruppe nur ersetzen, wenn Daten da sind (das Studio zeichnet einmal vor dem Laden) – Rückfall bevorzugt „Videos“ (v2.3.7)
  if (!alle[zustand.gruppe] && schluessel.length) zustand.gruppe = schluessel.find(g => g.endsWith(":videos")) || schluessel[0];
  gruppe = alle[zustand.gruppe] || [];
  const jetzt = Date.now();
  heute = gruppe.map(p => ({ p, k: { id: p.id, name: p.name, follower: p.kanal.follower || 0, dein: p.mein }, w: werte(p, jetzt), alt: werte(p, jetzt - BEWEGUNG_TAGE * TAG_MS) }));
  const pf = K.portfolio(heute.map(e => ({ id: e.p.id, werte: e.w })));
  const alt = K.portfolio(gruppe.map(p => ({ id: p.id, werte: werte(p, jetzt - BEWEGUNG_TAGE * TAG_MS) })));
  pfHeute = pf.genug ? Object.fromEntries(Object.entries(pf.kanaele).map(([id, k]) => [id, { st: k.staerke, dy: k.dynamik, feld: k.feld, gedeckelt: k.gedeckelt }])) : {};
  pfDamals = alt.genug ? Object.fromEntries(Object.entries(alt.kanaele).map(([id, k]) => [id, { st: k.staerke, dy: k.dynamik, feld: k.feld }])) : {};
  dein = heute.find(e => e.k.dein) || null;
  return { alle, schluessel };
}
const leer = text => `<div class="leer-hinweis">${text}</div>`;

// ---------- Freie Formen im HandKess-Stil ----------
const saatAus = t => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;
function zufallVon(seed) { let z = seed; return () => (z = (z * 16807) % 2147483647) / 2147483647; }
function stickerForm(cx, cy, r, seed) {   // Blase als geschnittener Sticker, Fläche ~ Kreis mit Radius r
  const zf = zufallVon(seed), n = 9 + Math.floor(zf() * 3), dreh = zf() * 6, pts = [];
  for (let i = 0; i < n; i++) { const w = dreh + i / n * 2 * Math.PI + (zf() - .5) * .35, rr = r * (1.02 + (zf() - .5) * .26); pts.push([cx + rr * Math.cos(w), cy + rr * Math.sin(w)]); }
  const k = Math.floor(zf() * n), a = pts[k], b = pts[(k + 1) % n]; pts.splice(k + 1, 0, [cx + ((a[0] + b[0]) / 2 - cx) * .78, cy + ((a[1] + b[1]) / 2 - cy) * .78]);
  return "M" + pts.map(p => p.map(z => z.toFixed(1)).join(" ")).join(" L") + "Z";
}
function pinselZug(punkte, profil) {
  const n = punkte.length, l = [], r = [];
  punkte.forEach(([x, y], i) => { const a = punkte[Math.max(i - 1, 0)], b = punkte[Math.min(i + 1, n - 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = profil(i / (n - 1));
    l.push([x - dy / d * w, y + dx / d * w]); r.push([x + dy / d * w, y - dx / d * w]); });
  const [x0, y0] = punkte[0], [x1, y1] = punkte[n - 1];
  return `<path d="M${[...l, ...r.reverse()].map(p => p.map(z => z.toFixed(1)).join(" ")).join(" L")}Z"/><circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="${profil(0).toFixed(1)}"/><circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${profil(1).toFixed(1)}"/>`;
}
function pinselPfeil(x0, y0, x1, y1, seed) {   // gebogen, dünn am alten Stand, Spitze aus zwei Pinseltropfen
  const zf = zufallVon(seed), dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), bieg = (zf() > .5 ? 1 : -1) * d * .18;
  const cx = (x0 + x1) / 2 - dy / d * bieg, cy = (y0 + y1) / 2 + dx / d * bieg, pts = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1]); }
  const ex = x1 - cx, ey = y1 - cy, ed = Math.hypot(ex, ey), ux = ex / ed, uy = ey / ed;
  const fluegel = w => { const c = Math.cos(w), s = Math.sin(w), sx = x1 - (ux * c - uy * s) * 13, sy = y1 - (uy * c + ux * s) * 13; return pinselZug([[sx, sy], [(sx + x1) / 2, (sy + y1) / 2], [x1, y1]], t => 1.2 + 1.6 * t); };
  return `<g class="pinselpfeil">${pinselZug(pts, t => .9 + 2.1 * t ** 1.5)}${fluegel(.55)}${fluegel(-.55)}</g>`;
}

// ---------- Datenfeld neben der Matrix (André 2026-11-17) ----------
// Öffnet sich beim Überfahren, Antippen oder Anfokussieren einer Blase – kein Popup, sondern ein fester Steckbrief:
// Feldwechsel → Vorher/Nachher-Vergleich; sonst die aktuellen Kanal-Zahlen. Dazu ein Status: Wie lebendig ist der Kanal?
let feldAuswahl = null;
const feldStart = () => (feldAuswahl && heute.find(e => e.k.id === feldAuswahl)) || dein || null;
function status(e) {
  const letzter = Math.min(...e.w.vids.map(v => v.tage));
  const aktiv = !isFinite(letzter) ? ["offen", "Keine Beiträge"] : letzter <= 14 ? ["lebendig", "Lebendig"] : letzter <= 30 ? ["ruhig", "Ruhig"] : letzter <= 90 ? ["schlaf", "Eingeschlafen"] : ["tot", "Inaktiv"];
  const t = e.w.viewsTrend, schwung = t == null ? "" : t > 10 ? "im Aufwind" : t < -10 ? "verliert an Views" : "stabil";
  return { klasse: aktiv[0], text: aktiv[1], schwung, letzter };
}
function datenfeld(e) {
  if (!e) return `<div class="df-leer">${sym("star", { g: 34 })}<b>Fahr über einen Kanal</b><span>Hier erscheinen seine Zahlen – und was sich seit 4 Wochen verändert hat.</span></div>`;
  const p = pfHeute[e.k.id] || { feld: "offen" }, a = pfDamals[e.k.id], st = status(e);
  const gewechselt = a && a.feld !== "offen" && p.feld !== "offen" && a.feld !== p.feld;
  const zeile = (l, jetzt, vorher) => `<div class="df-zeile"><span>${l}</span>${vorher !== undefined ? `<span class="df-vorher">${vorher}</span><span class="df-pfeil">→</span>` : ""}<b>${jetzt}</b></div>`;
  const tage = n => !isFinite(n) ? "–" : n < 1 ? "heute" : `vor ${Math.round(n)} ${Math.round(n) === 1 ? "Tag" : "Tagen"}`;
  const kopf = `<div class="df-kopf"><span class="df-feld ${p.feld}">${sym(p.feld, { g: 22 })}${FELD[p.feld]}</span>
    <div class="df-name">${esc(e.k.name)}${e.k.dein ? ` <span class="df-dein">Dein Kanal</span>` : ""}</div>
    <div class="df-status ${st.klasse}"><i></i>${st.text}${st.schwung ? ` · ${st.schwung}` : ""}</div></div>`;
  const inhalt = gewechselt
    ? `<div class="df-wechsel">${sym(a.feld, { g: 18 })} ${FELD[a.feld]} <span class="df-pfeil">→</span> ${sym(p.feld, { g: 18 })} <b>${FELD[p.feld]}</b><small>Feldwechsel in den letzten 4 Wochen</small></div>
       <div class="df-spalten"><span></span><span>vor 4 Wo.</span><span></span><span>heute</span></div>
       ${zeile("Stärke", p.st, a.st)}${zeile("Dynamik", p.dy, a.dy)}
       ${zeile("Ø Views", K.kurz(e.w.views), K.kurz(e.alt.views))}${zeile("Theor. ER", K.prozent(e.w.ter), K.prozent(e.alt.ter))}
       ${zeile("Views-Trend", pz(e.w.viewsTrend, true), pz(e.alt.viewsTrend, true))}${zeile("Posts/Woche", dez(e.w.ppw), dez(e.alt.ppw))}`
    : `${zeile("Follower", K.zahl(e.k.follower))}${zeile("Ø Views", K.kurz(e.w.views))}${zeile("Theor. ER", K.prozent(e.w.ter))}${zeile("Reichweite", K.prozent(e.w.reach))}
       ${zeile("Views-Trend (30 T)", pz(e.w.viewsTrend, true))}${zeile("Posts/Woche", dez(e.w.ppw))}${zeile("Stärke · Dynamik", `${p.st ?? "–"} · ${p.dy ?? "–"}`)}
       ${a && a.feld !== "offen" ? `<div class="df-hinweis">Vor 4 Wochen ebenfalls ${FELD[a.feld]}</div>` : ""}`;
  const alter = e.p.stand ? (Date.now() - e.p.stand) / TAG_MS : null;
  return `${kopf}${inhalt}<div class="df-fuss"><span>Letzter Beitrag ${tage(st.letzter)}</span><span>Stand ${alter == null ? "–" : tage(alter)}</span></div>
    <a class="df-link" href="${esc(K.sicher(e.p.url))}" target="_blank" rel="noopener">Kanal öffnen ↗</a>`;
}
function feldZeigen(id) {
  const ziel = document.getElementById("datenfeld"), e = heute.find(x => x.k.id === id);
  if (!ziel || !e || feldAuswahl === id) return;
  feldAuswahl = id; ziel.innerHTML = datenfeld(e);
  document.querySelectorAll("[data-blase]").forEach(b => b.classList.toggle("gewaehlt", b.dataset.blase === id));
}
document.addEventListener("pointerover", e => { const b = e.target.closest("[data-blase]"); if (b) feldZeigen(b.dataset.blase); });
document.addEventListener("focusin", e => { const b = e.target.closest("[data-blase]"); if (b) feldZeigen(b.dataset.blase); });

// ---------- Module ----------
const MODULE = [
  { id: "portfolio", titel: "Portfolio", frage: "Wo steht jeder Kanal – und wohin bewegt er sich?", bau: portfolioModul },
  { id: "netz", titel: "Du gegen die Gruppe", frage: "Wo liegst du vorn, wo fehlt dir etwas?", bau: netzModul },
  { id: "bau", titel: "Diagramm-Baukasten", frage: "Stell dir deine eigene Ansicht zusammen.", bau: baukastenModul },
  { id: "formate", titel: "Formate", frage: "Welches Format funktioniert bei wem?", bau: formatModul },
  { id: "zeiten", titel: "Posting-Zeiten", frage: "Wann bekommen Beiträge die meisten Interaktionen?", bau: zeitenModul },
  { id: "ausreisser", titel: "Ausreißer", frage: "Was ging in den letzten 30 Tagen weit über den Kanal-Schnitt hinaus?", bau: ausreisserModul },
];
const LAYOUT_STANDARD = [["portfolio", "voll"], ["netz", "halb"], ["zeiten", "halb"], ["formate", "voll"], ["bau", "voll"], ["ausreisser", "voll"]].map(([id, breite]) => ({ id, breite, weg: false }));
let layout = structuredClone(LAYOUT_STANDARD), layoutVorher = null;

function portfolioModul() {
  if (!Object.keys(pfHeute).length) return leer(`Für das Portfolio braucht es mindestens <b>4 Profile</b> in dieser Gruppe – hier sind es ${heute.length}. Speichere weitere Wettbewerber über „☆ Speichern“ im Radar.`);
  const B = 680, H = 480, L = 50, R = 20, O = 36, U = 64, w = B - L - R, h = H - O - U;
  const x = v => L + Math.min(96, Math.max(4, v)) / 100 * w, y = v => O + (1 - Math.min(96, Math.max(4, v)) / 100) * h;
  const xr = v => L + v / 100 * w, yr = v => O + (1 - v / 100) * h;
  const sichtbar = heute.filter(e => pfHeute[e.k.id] && pfHeute[e.k.id].feld !== "offen");
  const fmax = Math.max(1, ...heute.map(e => e.k.follower)), rad = e => 10 + 18 * Math.sqrt(e.k.follower / fmax);
  const q = (x0, y0, x1, y1, f, ecke) => `<rect class="q ${f}" x="${xr(x0)}" y="${yr(y1)}" width="${xr(x1) - xr(x0)}" height="${yr(y0) - yr(y1)}"/>
    ${sym(f, { x: (xr(x0) + xr(x1)) / 2 - 75, y: (yr(y0) + yr(y1)) / 2 - 75, g: 150, cls: "wz" })}
    <text class="qname" x="${ecke[0] === "r" ? xr(x1) : xr(x0)}" y="${ecke[1] === "o" ? yr(y1) - 10 : yr(y0) + 24}" text-anchor="${ecke[0] === "r" ? "end" : "start"}">${FELD[f]}</text>`;
  const pfeile = !bewegungZeigen ? "" : sichtbar.map(e => {
    const a = pfDamals[e.k.id], b = pfHeute[e.k.id];
    if (!a || a.feld === "offen") return "";
    const x0 = x(a.st), y0 = y(a.dy), xz = x(b.st), yz = y(b.dy), d = Math.hypot(xz - x0, yz - y0), r = rad(e) + 4;
    if (d < r + 14) return "";
    return `<g class="bewegung" data-bewegung-von="${esc(e.k.id)}"${tip(`<b>${esc(e.k.name)}</b><br>vor 4 Wochen: ${FELD[a.feld]} → heute: ${FELD[b.feld]}`)}><circle class="alt" cx="${x0}" cy="${y0}" r="4.5"/>${pinselPfeil(x0, y0, xz - (xz - x0) / d * r, yz - (yz - y0) / d * r, saatAus(e.k.id))}</g>`;
  }).join("");
  const blasen = [...sichtbar].sort((a, b) => b.k.follower - a.k.follower).map(e => {
    const p = pfHeute[e.k.id], cx = x(p.st), cy = y(p.dy), r = rad(e), g = Math.min(r * 1.2, 24), rechts = cx < L + w * .72;
    const alter = e.p.stand ? Math.round((Date.now() - e.p.stand) / TAG_MS) : null;
    return `<g class="blase ${e.k.dein ? "dein" : ""} ${feldAuswahl === e.k.id ? "gewaehlt" : ""}" data-blase="${esc(e.k.id)}" data-feld="${p.feld}" tabindex="0" role="button" aria-label="${esc(e.k.name)}: ${FELD[p.feld]} – Daten anzeigen">
      <path class="punkt ${e.k.dein ? "dein" : ""}" d="${stickerForm(cx, cy, r, saatAus(e.k.id))}"/>${sym(p.feld, { x: cx - g / 2, y: cy - g / 2, g, cls: "in-blase" + (e.k.dein ? " dein" : "") })}
      <text class="name" x="${rechts ? cx + r + 6 : cx - r - 6}" y="${cy + 4}" text-anchor="${rechts ? "start" : "end"}">${esc(e.k.name.slice(0, 22))}</text>
      <circle class="trefferflaeche" cx="${cx}" cy="${cy}" r="${r + 8}"/></g>`;
  }).join("");
  const n = f => sichtbar.filter(e => pfHeute[e.k.id].feld === f).length;
  const offen = heute.filter(e => !pfHeute[e.k.id] || pfHeute[e.k.id].feld === "offen");
  const ordnung = { star: 0, frage: 1, cash: 2, dog: 3, offen: 4 };
  return `<div class="bau" style="margin-bottom:4px"><button class="chip ${bewegungZeigen ? "an" : ""}" data-bewegung aria-pressed="${bewegungZeigen}">Bewegung seit 4 Wochen</button><button class="chip ${!bewegungZeigen ? "an" : ""}" data-nur-aktuell aria-pressed="${!bewegungZeigen}">Nur aktueller Stand</button></div>
  <div class="portfolio-raster"><svg class="chart" viewBox="0 0 ${B} ${H}" role="img" aria-label="Portfolio-Matrix: Stärke waagerecht, Dynamik senkrecht">
    ${q(0, 50, 50, 100, "frage", "lo")}${q(50, 50, 100, 100, "star", "ro")}${q(0, 0, 50, 50, "dog", "lu")}${q(50, 0, 100, 50, "cash", "ru")}
    <line class="schwelle" x1="${xr(50)}" y1="${yr(0)}" x2="${xr(50)}" y2="${yr(100)}"/><line class="schwelle" x1="${xr(0)}" y1="${yr(50)}" x2="${xr(100)}" y2="${yr(50)}"/>
    <text class="ttl" x="${xr(50)}" y="${H - 8}" text-anchor="middle">Stärke im Vergleich →</text>
    <text class="ttl" transform="translate(16 ${yr(100)}) rotate(-90)" text-anchor="end">Dynamik →</text>
    ${pfeile}${blasen}</svg>
    <aside class="datenfeld" id="datenfeld" aria-live="polite">${datenfeld(feldStart())}</aside></div>
    <div class="legende"><span><i class="dein"></i>Dein Kanal</span><span><i class="andere"></i>Wettbewerber · Größe = Follower</span>${bewegungZeigen ? `<span>○ ⟶ vom Stand vor 4 Wochen zu heute</span>` : ""}
      <span>${["star", "frage", "cash", "dog"].map(f => `${sym(f, { g: 14 })} ${FELD[f]} ${n(f)}`).join(" · ")}</span></div>
    ${offen.length ? `<p class="leise">Ohne Platz (zu wenig Daten): ${offen.map(e => esc(e.k.name)).join(", ")}</p>` : ""}
    <details><summary>Wie jeder Kanal zu seinem Feld kommt</summary><div class="tabelle"><table><thead><tr><th>Profil</th><th>Feld</th><th class="r">Stärke</th><th class="r">Ø Views</th><th class="r">Theor. ER</th><th class="r">Reichweite</th><th class="r">Dynamik</th><th class="r">Views-Trend</th><th class="r">Follower/Woche</th><th class="r">ER-Trend</th></tr></thead><tbody>
    ${[...heute].sort((a, b) => ordnung[pfHeute[a.k.id]?.feld || "offen"] - ordnung[pfHeute[b.k.id]?.feld || "offen"]).map(e => { const p = pfHeute[e.k.id] || { feld: "offen" }, a = pfDamals[e.k.id];
      return `<tr data-portfolio-zeile="${esc(e.k.id)}"><td><a href="${esc(K.sicher(e.p.url))}" target="_blank" rel="noopener">${esc(e.k.name)}</a>${e.k.dein ? " ●" : ""}</td>
      <td>${sym(p.feld, { g: 15 })} ${FELD[p.feld]}${a && a.feld !== "offen" && a.feld !== p.feld && p.feld !== "offen" ? `<div class="stand">vor 4 Wochen: ${FELD[a.feld]}</div>` : ""}</td>
      <td class="r"><b>${p.st ?? "–"}</b></td><td class="r">${K.kurz(e.w.views)}</td><td class="r">${K.prozent(e.w.ter)}</td><td class="r">${K.prozent(e.w.reach)}</td>
      <td class="r"><b>${p.dy ?? "–"}</b></td><td class="r">${pz(e.w.viewsTrend, true)}</td><td class="r">${pz(e.w.wachstum, true)}</td><td class="r">${pz(e.w.terTrend, true)}</td></tr>`; }).join("")}
    </tbody></table></div></details>`;
}

// Rang eines Werts in der Gruppe (Anteil geschlagener Kanäle, Gleichstand halb)
function rangIn(e, f) {
  const m = e.w[f], a = heute.filter(x => x !== e && x.w[f] != null).map(x => x.w[f]);
  return m == null || !a.length ? null : (a.filter(w => w < m).length + a.filter(w => w === m).length / 2) / a.length;
}
function netzModul() {
  if (!dein) return leer(`Markiere deinen eigenen Kanal dieser Plattform im Radar mit <b>„Mein Kanal“</b> – dann zeigt dieses Modul, wo du gegenüber der Gruppe vorn liegst und wo dir etwas fehlt.`);
  if (heute.length < 3) return leer(`Für einen Vergleich braucht es mindestens <b>2 Wettbewerber</b> in dieser Gruppe.`);
  const ACHSEN = [["views", "Ø Views"], ["ter", "Theor. ER"], ["reach", "Reichweite"], ["viewsTrend", "Views-Trend"], ["wachstum", "Follower/Woche"], ["ppw", "Posts/Woche"]];
  const S = 380, M = S / 2, R = 130, n = ACHSEN.length;
  const pt = (i, v) => [M + Math.sin(i / n * 2 * Math.PI) * R * v, M - Math.cos(i / n * 2 * Math.PI) * R * v];
  const poly = vals => vals.map((v, i) => pt(i, v ?? 0).map(z => z.toFixed(1)).join(",")).join(" ");
  const deinW = ACHSEN.map(([f]) => rangIn(dein, f));
  const fmt = (f, v) => f === "views" ? K.kurz(v) : f === "ppw" ? dez(v) : pz(v, ["viewsTrend", "wachstum"].includes(f));
  const ringe = [.25, .5, .75, 1].map(v => `<polygon class="netz-gitter" points="${poly(ACHSEN.map(() => v))}"/>`).join("");
  const speichen = ACHSEN.map(([, name], i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.2); return `<line class="netz-speiche" x1="${M}" y1="${M}" x2="${x}" y2="${y}"/><text class="wert" x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - M) < 5 ? "middle" : lx > M ? "start" : "end"}" font-weight="700">${name}</text>`; }).join("");
  const punkte = deinW.map((v, i) => { const [x, y] = pt(i, v ?? 0); return `<g${tip(`<b>${ACHSEN[i][1]}</b><br>${v == null ? "keine Daten" : `Dein Rang: ${Math.round(v * 100)} von 100<br>Dein Wert: ${fmt(ACHSEN[i][0], dein.w[ACHSEN[i][0]])}`}`)}><circle class="punkt dein" cx="${x}" cy="${y}" r="5"/><circle class="trefferflaeche" cx="${x}" cy="${y}" r="14"/></g>`; }).join("");
  const mit = deinW.map((v, i) => [v, ACHSEN[i][1]]).filter(x => x[0] != null).sort((a, b) => b[0] - a[0]);
  return `<svg class="chart" viewBox="-40 -10 ${S + 80} ${S + 20}" role="img" aria-label="Netzdiagramm: dein Kanal gegen die Gruppe" style="max-width:460px">
      ${ringe}${speichen}<polygon class="netz-gruppe" points="${poly(ACHSEN.map(() => .5))}"/><polygon class="netz-dein" points="${poly(deinW)}"/>${punkte}</svg>
    <div class="legende"><span><i class="dein"></i>Dein Rang je Kennzahl</span><span>- - - Mitte der Gruppe</span></div>
    ${mit.length >= 2 ? `<p class="leise" style="margin:10px 0 0" data-netz-fazit><b style="color:var(--ink)">Vorn:</b> ${mit.slice(0, 2).map(s => s[1]).join(", ")} · <b style="color:var(--ink)">Lücke:</b> ${mit.slice(-2).map(s => s[1]).join(", ")}</p>` : ""}`;
}

const BAU_FELDER = { views: ["Ø Views", K.kurz], ter: ["Theoretische ER", n => K.prozent(n)], reach: ["Reichweite", n => K.prozent(n)], viewsTrend: ["Views-Trend", n => pz(n, true)], wachstum: ["Follower/Woche", n => pz(n, true)], ppw: ["Posts pro Woche", dez], streuung: ["Schwankung der Views", n => pz(n)], follower: ["Follower", K.kurz] };
const wert = (e, f) => f === "follower" ? e.k.follower : e.w[f];
function baukastenModul() {
  if (heute.length < 2) return leer("Für den Baukasten braucht es mindestens 2 Profile in dieser Gruppe.");
  const opt = sel => Object.entries(BAU_FELDER).map(([id, [n]]) => `<option value="${id}" ${sel === id ? "selected" : ""}>${n}</option>`).join("");
  return `<div class="bau">
    <label>Diagramm<select data-bau="typ"><option value="streu" ${bau.typ === "streu" ? "selected" : ""}>Streuung (X gegen Y)</option><option value="balken" ${bau.typ === "balken" ? "selected" : ""}>Rangliste (Balken)</option></select></label>
    ${bau.typ === "streu" ? `<label>X-Achse<select data-bau="x">${opt(bau.x)}</select></label>` : ""}
    <label>${bau.typ === "streu" ? "Y-Achse" : "Kennzahl"}<select data-bau="y">${opt(bau.y)}</select></label>
    ${bau.typ === "streu" ? `<button class="chip ${bau.log ? "an" : ""}" data-log aria-pressed="${!!bau.log}">Log-Skala Y</button>` : ""}
    <button class="knopf" data-ansicht-speichern style="min-height:40px">☆ Ansicht speichern</button></div>
    ${bau.typ === "streu" ? streu() : balken()}
    <div class="gespeichert"><span class="leise">Gespeichert:</span>${ansichten.map((a, i) => `<span><button class="chip" data-ansicht-laden="${i}">${esc(a.name)}</button><button class="knopf" data-ansicht-weg="${i}" aria-label="Ansicht „${esc(a.name)}“ löschen" title="Löschen">×</button></span>`).join("")}</div>`;
}
function streu() {
  const liste = heute.filter(e => wert(e, bau.x) != null && wert(e, bau.y) != null);
  const fehlt = heute.filter(e => !liste.includes(e));
  if (liste.length < 2) return leer(`Für ${BAU_FELDER[bau.x][0]} gegen ${BAU_FELDER[bau.y][0]} haben zu wenige Profile Werte.`);
  const B = 680, H = 360, L = 92, R = 24, O = 16, U = 46, w = B - L - R, h = H - O - U;
  const xs = liste.map(e => wert(e, bau.x)), ys = liste.map(e => wert(e, bau.y));
  const sk = vs => { const lo = Math.min(0, ...vs), hi = Math.max(...vs); return [lo, hi > lo ? hi + (hi - lo) * .08 : lo + 1]; };
  const log = bau.log && Math.min(...ys) > 0;
  const [x0, x1] = sk(xs), [y0, y1] = log ? [Math.min(...ys) / 1.3, Math.max(...ys) * 1.3] : sk(ys);
  const x = v => L + (v - x0) / (x1 - x0) * w;
  const y = log ? v => O + (1 - (Math.log(v) - Math.log(y0)) / (Math.log(y1) - Math.log(y0))) * h : v => O + (1 - (v - y0) / (y1 - y0)) * h;
  const ticks = (a, b, l = false) => [0, .25, .5, .75, 1].map(t => l ? Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t) : a + (b - a) * t);
  const fx = BAU_FELDER[bau.x][1], fy = BAU_FELDER[bau.y][1];
  return `<svg class="chart" viewBox="0 0 ${B} ${H}" role="img" aria-label="Streudiagramm ${BAU_FELDER[bau.x][0]} gegen ${BAU_FELDER[bau.y][0]}">
    <g class="achse">${ticks(y0, y1, log).map(t => `<line x1="${L}" x2="${B - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fy(t)}</text>`).join("")}
      ${ticks(x0, x1).map(t => `<text x="${x(t)}" y="${H - U + 18}" text-anchor="middle">${fx(t)}</text>`).join("")}
      <line class="basis" x1="${L}" x2="${B - R}" y1="${O + h}" y2="${O + h}"/></g>
    <text class="ttl" x="${B - R}" y="${H - 6}" text-anchor="end">${BAU_FELDER[bau.x][0]} →</text>
    <text class="ttl" transform="translate(12 ${O}) rotate(-90)" text-anchor="end">${BAU_FELDER[bau.y][0]} →</text>
    ${liste.map(e => { const cx = x(wert(e, bau.x)), cy = y(wert(e, bau.y)), rechts = cx < L + w * .8;
      return `<g data-punkt="${esc(e.k.id)}"${tip(`<b>${esc(e.k.name)}</b><br>${BAU_FELDER[bau.x][0]}: ${fx(wert(e, bau.x))}<br>${BAU_FELDER[bau.y][0]}: ${fy(wert(e, bau.y))}`)}><circle class="punkt ${e.k.dein ? "dein" : ""}" cx="${cx}" cy="${cy}" r="${e.k.dein ? 9 : 7}"/>
        <text class="name" x="${rechts ? cx + 12 : cx - 12}" y="${cy + 4}" text-anchor="${rechts ? "start" : "end"}">${esc(e.k.name.slice(0, 22))}</text><circle class="trefferflaeche" cx="${cx}" cy="${cy}" r="16"/></g>`; }).join("")}
    </svg><div class="legende"><span><i class="dein"></i>Dein Kanal</span><span><i class="andere"></i>Wettbewerber</span>${fehlt.length ? `<span>ohne Wert: ${fehlt.map(e => esc(e.k.name)).join(", ")}</span>` : ""}</div>`;
}
function balken() {
  const f = BAU_FELDER[bau.y][1], liste = heute.filter(e => wert(e, bau.y) != null).sort((a, b) => wert(b, bau.y) - wert(a, bau.y));
  if (!liste.length) return leer(`Keine Werte für ${BAU_FELDER[bau.y][0]}.`);
  const max = Math.max(...liste.map(e => Math.abs(wert(e, bau.y)))) || 1, neg = liste.some(e => wert(e, bau.y) < 0);
  const B = 680, Z = 34, L = 150, R = 90, H = liste.length * Z + 10, w = B - L - R, null0 = neg ? w / 2 : 0;
  return `<svg class="chart" viewBox="0 0 ${B} ${H}" role="img" aria-label="Rangliste ${BAU_FELDER[bau.y][0]}">
    ${liste.map((e, i) => { const v = wert(e, bau.y), bw = Math.abs(v) / max * (neg ? w / 2 : w), x0 = L + null0 + (v < 0 ? -bw : 0);
      return `<g${tip(`<b>${esc(e.k.name)}</b><br>${BAU_FELDER[bau.y][0]}: ${f(v)}<br>Platz ${i + 1} von ${liste.length}`)}><text class="name" x="${L - 10}" y="${i * Z + 22}" text-anchor="end">${esc(e.k.name.slice(0, 20))}</text>
      <rect class="balken ${e.k.dein ? "dein" : ""}" x="${x0}" y="${i * Z + 8}" width="${Math.max(bw, 2)}" height="${Z - 14}" rx="3"/>
      <text class="wert" x="${(v < 0 ? x0 : x0 + bw) + (v < 0 ? -6 : 6)}" y="${i * Z + 22}" text-anchor="${v < 0 ? "end" : "start"}">${f(v)}</text>
      <rect class="trefferflaeche" x="0" y="${i * Z + 2}" width="${B}" height="${Z}"/></g>`; }).join("")}
    ${neg ? `<line x1="${L + null0}" x2="${L + null0}" y1="0" y2="${H}" stroke="var(--muted)"/>` : ""}</svg>`;
}

// Interaktionen je Beitrag: je View, wenn die Plattform Views zeigt, sonst je Follower
function quote(e, v) { const i = (v.likes || 0) + (v.kommentare || 0); return v.views ? i / v.views * 100 : e.k.follower ? i / e.k.follower * 100 : null; }
const STUFEN = 5, stufe = (v, lo, hi) => hi - lo < 1e-6 ? 2 : Math.min(STUFEN - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * STUFEN)));   // alle gleich → mittlerer Ton
const skala = (lo, hi, fmt) => `<div class="skala">${fmt(lo)} ${[0, 1, 2, 3, 4].map(i => `<span class="s" style="background:var(--h${i})"></span>`).join("")} ${fmt(hi)}</div>`;
const einheit = () => heute.some(e => e.w.im.some(v => v.views)) ? "ER je View" : "ER je Follower";
function formatModul() {
  const zaehler = {};
  heute.forEach(e => e.w.im.forEach(v => (tags[v.id] || []).forEach(t => zaehler[t] = (zaehler[t] || 0) + 1)));
  const formate = Object.entries(zaehler).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  if (!formate.length) return leer(`Noch keine Format-Hashtags in dieser Gruppe. Vergib sie im Radar unter den Beiträgen (z. B. <b>#tutorial</b>, <b>#hook-frage</b>) – dann zeigt die Heatmap, welches Format bei wem funktioniert.`);
  const zellen = heute.map(e => formate.map(f => { const q = e.w.im.filter(v => (tags[v.id] || []).includes(f)).map(v => quote(e, v)).filter(x => x != null); return q.length ? { er: schnitt(q), n: q.length } : null; }));
  const alle = zellen.flat().filter(Boolean).map(z => z.er), lo = Math.min(...alle), hi = Math.max(...alle);
  const B = 680, Z = 34, L = 150, T = 30, sp = (B - L) / formate.length, H = T + heute.length * Z + 4;
  const spalte = formate.map((f, j) => schnitt(zellen.map(r => r[j]?.er).filter(x => x != null)));
  const top = formate[spalte.indexOf(Math.max(...spalte))];
  return `<svg class="chart" viewBox="0 0 ${B} ${H}" role="img" aria-label="Heatmap Formate je Kanal">
    ${formate.map((f, j) => `<text class="ttl" x="${L + j * sp + sp / 2}" y="18" text-anchor="middle" style="text-transform:none;letter-spacing:0">${esc(f.length > 14 ? f.slice(0, 13) + "…" : f)}</text>`).join("")}
    ${heute.map((e, i) => `<text class="name" x="${L - 10}" y="${T + i * Z + 21}" text-anchor="end">${esc(e.k.name.slice(0, 20))}${e.k.dein ? " ●" : ""}</text>` + zellen[i].map((z, j) => z
      ? `<g data-zelle${tip(`<b>${esc(e.k.name)} · ${esc(formate[j])}</b><br>Ø ${einheit()}: ${pz(z.er)}<br>${z.n} ${z.n === 1 ? "Beitrag" : "Beiträge"}`)}><rect class="zelle" x="${L + j * sp}" y="${T + i * Z}" width="${sp}" height="${Z}" style="fill:var(--h${stufe(z.er, lo, hi)})"/></g>`
      : `<rect class="zelle leer" x="${L + j * sp + 3}" y="${T + i * Z + 3}" width="${sp - 6}" height="${Z - 6}"/>`).join("")).join("")}
    </svg>${skala(lo, hi, n => pz(n))}
    <p class="leise" style="margin:8px 0 0"><b style="color:var(--ink)">Stärkstes Format der Gruppe:</b> ${esc(top)} · Wert: Ø ${einheit()} · gestrichelt = Format nicht genutzt · ● = dein Kanal</p>`;
}
const SLOTS = ["0–6", "6–9", "9–12", "12–15", "15–18", "18–21", "21–24"], TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const slotVon = h => h < 6 ? 0 : Math.min(6, Math.floor((h - 6) / 3) + 1);
function zeitenModul() {
  const quelle = heute.filter(e => !nurStars || pfHeute[e.k.id]?.feld === "star").flatMap(e => e.w.im.map(v => ({ v, q: quote(e, v) }))).filter(x => x.q != null);
  const steuer = `<div class="bau" style="margin-bottom:6px"><button class="chip ${!nurStars ? "an" : ""}" data-zeiten="alle">Alle Kanäle</button><button class="chip ${nurStars ? "an" : ""}" data-zeiten="stars" ${Object.keys(pfHeute).length ? "" : "disabled"}>${sym("star", { g: 14 })} Nur Stars</button></div>`;
  if (quelle.length < 5) return steuer + leer("Zu wenige Beiträge mit Datum und Interaktionen für eine Zeit-Auswertung.");
  const zellen = TAGE.map(() => SLOTS.map(() => []));
  quelle.forEach(({ v, q }) => { const d = new Date(v.datum); zellen[(d.getDay() + 6) % 7][slotVon(d.getHours())].push(q); });
  const werteZ = zellen.map(r => r.map(l => l.length ? { er: schnitt(l), n: l.length } : null));
  const alle = werteZ.flat().filter(Boolean).map(z => z.er), lo = Math.min(...alle), hi = Math.max(...alle);
  let best = null; werteZ.forEach((r, t) => r.forEach((z, s) => { if (z && z.n >= 2 && (!best || z.er > best.er)) best = { ...z, t, s }; }));
  const B = 440, L = 40, T = 26, Z = 34, sp = (B - L) / SLOTS.length, H = T + 7 * Z;
  return steuer + `<svg class="chart" viewBox="0 0 ${B} ${H}" role="img" aria-label="Heatmap Posting-Zeiten" style="max-width:540px">
    ${SLOTS.map((s, j) => `<text class="wert" x="${L + j * sp + sp / 2}" y="16" text-anchor="middle">${s}</text>`).join("")}
    ${TAGE.map((d, t) => `<text class="name" x="${L - 8}" y="${T + t * Z + 21}" text-anchor="end">${d}</text>` + werteZ[t].map((z, s) => z
      ? `<g data-zelle${tip(`<b>${d}, ${SLOTS[s]} Uhr</b><br>Ø ${einheit()}: ${pz(z.er)}<br>${z.n} ${z.n === 1 ? "Beitrag" : "Beiträge"}`)}><rect class="zelle" x="${L + s * sp}" y="${T + t * Z}" width="${sp}" height="${Z}" style="fill:var(--h${stufe(z.er, lo, hi)})"/></g>`
      : `<rect class="zelle leer" x="${L + s * sp + 3}" y="${T + t * Z + 3}" width="${sp - 6}" height="${Z - 6}"/>`).join("")).join("")}
    ${best ? `<rect x="${L + best.s * sp + 1.5}" y="${T + best.t * Z + 1.5}" width="${sp - 3}" height="${Z - 3}" fill="none" stroke="var(--ink)" stroke-width="3"/>` : ""}
    </svg>${skala(lo, hi, n => pz(n))}
    <p class="leise" style="margin:8px 0 0" data-bestes-fenster><b style="color:var(--ink)">Bestes Fenster:</b> ${best ? `${TAGE[best.t]} ${SLOTS[best.s]} Uhr (${pz(best.er)} ${einheit()}, ${best.n} Beiträge)` : "– (mind. 2 Beiträge je Feld)"} · deine Ortszeit</p>`;
}
function ausreisserModul() {
  const liste = heute.flatMap(e => {
    const basis = e.w.vids.filter(v => v.tage <= 90), mitViews = basis.some(v => v.views), w = v => mitViews ? v.views : (v.likes || 0) + (v.kommentare || 0);
    const m = K.median(basis.map(w).filter(x => x != null && x > 0));
    return m ? e.w.vids.filter(v => v.tage <= 30 && w(v) != null).map(v => ({ e, v, f: w(v) / m, w: w(v), m, art: mitViews ? "Views" : "Interaktionen" })) : [];
  }).filter(x => x.f >= 1.8).sort((a, b) => b.f - a.f)
    .filter((x, i, alle) => alle.slice(0, i).filter(y => y.e === x.e).length < 2).slice(0, 8);   // höchstens zwei je Kanal
  if (!liste.length) return leer("Keine Ausreißer in den letzten 30 Tagen – kein Beitrag kam auf das 1,8-Fache des eigenen Kanal-Medians.");
  return `<div class="feed">${liste.map(({ e, v, f, w, m, art }) => `<article class="post" data-ausreisser><a href="${esc(K.sicher(v.url))}" target="_blank" rel="noopener"><div class="bild">${e.p.plattform === "youtube" ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="faktor">${dez(f)}×</span></div>
    <div class="info"><b>${esc(v.titel)}</b>${esc(e.k.name)}${e.k.dein ? " ●" : ""} · vor ${Math.round(v.tage)} ${Math.round(v.tage) === 1 ? "Tag" : "Tagen"}<br>${K.kurz(w)} ${art} · Median ${K.kurz(m)}
    <div style="margin-top:6px">${(tags[v.id] || []).slice(0, 2).map(t => `<span class="tag">${esc(t)}</span>`).join("")}${sym(pfHeute[e.k.id]?.feld, { g: 15 })}</div></div></a>${e.p.plattform === "youtube" ? `<button class="knopf thumb-knopf" data-thumb="${esc(v.id)}">↓ Thumbnail</button>` : ""}</article>`).join("")}</div>
    <p class="leise" style="margin:10px 0 0">Faktor = Wert ÷ Median des eigenen Kanals (90 Tage). Ab 1,8× gilt ein Beitrag als Ausreißer; höchstens zwei je Kanal.</p>`;
}

// ---------- Zeichnen ----------
function plakate() {
  if (!heute.length) { $("s-plakate").innerHTML = ""; return; }
  const stars = heute.filter(e => pfHeute[e.k.id]?.feld === "star");
  const alt = Math.max(...heute.map(e => e.p.stand ? (Date.now() - e.p.stand) / TAG_MS : 0));
  if (dein) {
    const p = pfHeute[dein.k.id], platz = [...heute].filter(e => e.w.views != null).sort((a, b) => b.w.views - a.w.views).indexOf(dein) + 1;
    $("s-plakate").innerHTML = `
      <div class="plakat dein" data-plakat="feld"><div class="l">Dein Feld</div><div class="w">${p ? sym(p.feld, { g: 30 }) + FELD[p.feld] : "–"}</div><div class="z">${p ? (pfDamals[dein.k.id] && pfDamals[dein.k.id].feld !== "offen" ? "vor 4 Wochen: " + FELD[pfDamals[dein.k.id].feld] : "noch kein Stand von vor 4 Wochen") : "Portfolio ab 4 Profilen"}</div></div>
      <div class="plakat"><div class="l">Ø Views · Platz</div><div class="w">${platz ? `${platz} / ${heute.filter(e => e.w.views != null).length}` : "–"}</div><div class="z">${K.kurz(dein.w.views)} pro Beitrag</div></div>
      <div class="plakat"><div class="l">Views-Trend</div><div class="w">${pz(dein.w.viewsTrend, true)}</div><div class="z">letzte 30 Tage ggü. davor</div></div>
      <div class="plakat"><div class="l">Stars in der Gruppe</div><div class="w">${stars.length}</div><div class="z">${stars.filter(e => !e.k.dein).map(e => esc(e.k.name)).join(", ") || "–"}</div></div>`;
  } else {
    $("s-plakate").innerHTML = `
      <div class="plakat dein"><div class="l">Kanäle in der Gruppe</div><div class="w">${heute.length}</div><div class="z">Markiere deinen Kanal im Radar mit „Mein Kanal“</div></div>
      <div class="plakat"><div class="l">Stars</div><div class="w">${stars.length}</div><div class="z">${stars.map(e => esc(e.k.name)).join(", ") || "–"}</div></div>
      <div class="plakat"><div class="l">Stärkster Views-Trend</div><div class="w">${pz(Math.max(...heute.map(e => e.w.viewsTrend ?? -Infinity)), true)}</div><div class="z">letzte 30 Tage ggü. davor</div></div>
      <div class="plakat"><div class="l">Ältester Datenstand</div><div class="w">${Math.round(alt)} T</div><div class="z">Profile im Radar öffnen hält die Zahlen frisch</div></div>`;
  }
}
function zeichnen() {
  if (document.getElementById("studio").hidden) return;   // nur zeichnen, wenn der Reiter Analyse•Studio offen ist
  const { alle, schluessel } = rechnen();
  const anzahl = o => new Set(profile.filter(p => o === "ohne" ? !p.ordner : p.ordner === o).map(p => p.schluessel)).size;
  $("s-ordner").innerHTML = `<span class="lab">Ordner</span>` + [["alle", `Alle (${Object.keys(gespeichert.profile).length})`], ...gespeichert.ordner.map(o => [o.id, `${esc(o.name)} (${anzahl(o.id)})`]), ...(anzahl("ohne") ? [["ohne", `Ohne Ordner (${anzahl("ohne")})`]] : [])]
    .map(([id, n]) => `<button class="chip ${zustand.ordner === id ? "an" : ""}" data-ordner="${esc(id)}">${n}</button>`).join("");
  $("s-gruppe").innerHTML = `<span class="lab">Plattform</span>` + (schluessel.map(g => { const [pl, be] = g.split(":"); return `<button class="chip ${zustand.gruppe === g ? "an" : ""}" data-gruppe="${esc(g)}">${PLATTFORMEN[pl]} · ${BEREICH[be] || be} (${alle[g].length})</button>`; }).join("") || `<span class="leise">keine gespeicherten Profile mit Zahlen</span>`);
  $("s-zeitraum").innerHTML = `<span class="lab">Zeitraum</span>` + ZEITRAUM.map(([t, n]) => `<button class="chip ${zustand.zeitraum === t ? "an" : ""}" data-zeitraum="${t}">${n}</button>`).join("");
  document.querySelectorAll("#s-nav button").forEach(b => b.classList.toggle("an", b.dataset.modul === modul));
  const einzeln = modul !== "alle";
  if (!heute.length) {
    $("s-plakate").innerHTML = "";
    $("s-flaeche").innerHTML = `<section class="kachel">${leer(Object.keys(gespeichert.profile).length ? "In diesem Ordner liegen noch keine Profile mit gesammelten Zahlen. Öffne sie einmal mit dem Radar." : "Noch keine Profile gespeichert. Öffne einen Kanal mit dem Radar und klicke <b>„☆ Speichern“</b> – hier entsteht dann deine Analyse.")}</section>`;
    return;
  }
  $("s-plakate").hidden = einzeln; if (!einzeln) plakate();
  const liste = einzeln ? [{ id: modul, breite: "voll", weg: false }] : layout;
  $("s-flaeche").innerHTML = liste.map((l, i) => {
    const m = MODULE.find(x => x.id === l.id);
    return `<section class="kachel ${l.breite === "halb" && !einzeln ? "halb" : ""} ${l.weg ? "weg" : ""}" data-kachel="${m.id}">
      <div class="kachel-kopf"><h2>${m.titel}</h2><span class="frage">${m.frage}</span>
        <span class="s-werkzeug">
          ${!einzeln ? `<button class="knopf nur-bearbeiten" data-schieben="-1" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Nach oben">↑</button><button class="knopf nur-bearbeiten" data-schieben="1" data-i="${i}" ${i === liste.length - 1 ? "disabled" : ""} aria-label="Nach unten">↓</button>
          <button class="knopf nur-bearbeiten" data-breite="${i}">${l.breite === "halb" ? "Volle Breite" : "Halbe Breite"}</button><button class="knopf nur-bearbeiten" data-weg="${i}">${l.weg ? "Einblenden" : "Ausblenden"}</button>
          <button class="knopf" data-oeffnen="${m.id}">Groß ↗</button>` : ""}<button class="knopf" data-png="${m.id}">↓ PNG</button>
        </span></div>${m.bau()}</section>`;
  }).join("");
  entzerren();
}
// Namen in Streuung und Matrix platzieren: je Name den freiesten Platz rund um seinen Punkt suchen
// (rechts, links, oben, unten, schräg) – Hindernisse sind alle Punkte und die schon gesetzten Namen.
function entzerren() {
  document.querySelectorAll("#studio svg.chart").forEach(svg => {
    if (/Heatmap|Rangliste|Netz/.test(svg.getAttribute("aria-label") || "")) return;
    const gruppen = [...svg.querySelectorAll("g")].filter(g => g.querySelector(":scope > text.name") && g.querySelector(":scope > .punkt"));
    if (gruppen.length < 2) return;
    const vb = svg.viewBox.baseVal, rand = 4;
    const flaeche = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const box = el => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const punkte = gruppen.map(g => box(g.querySelector(":scope > .punkt")));
    const gesetzt = [];
    gruppen.map((g, i) => ({ g, i, p: punkte[i] })).sort((a, b) => b.p.w - a.p.w).forEach(({ g, i, p }) => {
      const t = g.querySelector(":scope > text.name"), b = box(t), w = b.w, h = b.h, cx = p.x + p.w / 2, cy = p.y + p.h / 2, r = p.w / 2;
      const kandidaten = [
        { x: p.x + p.w + 5, y: cy - h / 2, a: "start" }, { x: p.x - 5 - w, y: cy - h / 2, a: "end" },
        { x: cx - w / 2, y: p.y - 3 - h, a: "middle" }, { x: cx - w / 2, y: p.y + p.h + 3, a: "middle" },
        { x: p.x + p.w + 3, y: p.y - h + 4, a: "start" }, { x: p.x + p.w + 3, y: p.y + p.h - 4, a: "start" },
        { x: p.x - 3 - w, y: p.y - h + 4, a: "end" }, { x: p.x - 3 - w, y: p.y + p.h - 4, a: "end" }];
      let best = null;
      kandidaten.forEach((k, n) => {
        const kb = { x: k.x, y: k.y, w, h };
        let s = gesetzt.reduce((t2, o) => t2 + flaeche(kb, o) * 3, 0) + punkte.reduce((t2, o, j) => t2 + (j === i ? 0 : flaeche(kb, o)), 0);
        if (kb.x < vb.x + rand || kb.x + w > vb.x + vb.width - rand || kb.y < vb.y + rand || kb.y + h > vb.y + vb.height - rand) s += 1e6;
        s += n * .5;   // bei Gleichstand die gewohnte Seite
        if (!best || s < best.s) best = { ...k, s };
      });
      const verschiebungY = b.y - +t.getAttribute("y");   // Abstand Grundlinie ↔ Oberkante
      t.setAttribute("text-anchor", best.a);
      t.setAttribute("x", (best.a === "start" ? best.x : best.a === "end" ? best.x + w : best.x + w / 2).toFixed(1));
      t.setAttribute("y", (best.y - verschiebungY).toFixed(1));
      gesetzt.push({ x: best.x, y: best.y, w, h });
    });
  });
}

// ---------- Bedienung ----------
const ansichtenSpeichern = () => chrome.storage.local.set({ analyseAnsichten: ansichten });
document.addEventListener("click", e => {
  if (!e.target.closest("#studio")) return;   // eingebettet im Dashboard: nur eigene Knöpfe
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.modul) { modul = b.dataset.modul; window.scrollTo(0, 0); }
  else if (b.dataset.oeffnen) { modul = b.dataset.oeffnen; window.scrollTo(0, 0); }
  else if (b.dataset.ordner) { zustand.ordner = b.dataset.ordner; merke("hsr_studio_ordner", zustand.ordner); }
  else if (b.dataset.gruppe) { zustand.gruppe = b.dataset.gruppe; merke("hsr_studio_gruppe", zustand.gruppe); }
  else if (b.dataset.zeitraum != null) { zustand.zeitraum = +b.dataset.zeitraum; merke("hsr_zeitraum", zustand.zeitraum); }
  else if (b.dataset.schieben) { const i = +b.dataset.i, j = i + +b.dataset.schieben; [layout[i], layout[j]] = [layout[j], layout[i]]; }
  else if (b.dataset.breite) { const l = layout[+b.dataset.breite]; l.breite = l.breite === "halb" ? "voll" : "halb"; }
  else if (b.dataset.weg) { const l = layout[+b.dataset.weg]; l.weg = !l.weg; }
  else if (b.hasAttribute("data-bewegung") || b.hasAttribute("data-nur-aktuell")) { bewegungZeigen = b.hasAttribute("data-bewegung"); merke("hsr_bewegung", bewegungZeigen ? "1" : "0"); }
  else if (b.dataset.zeiten) nurStars = b.dataset.zeiten === "stars";
  else if (b.hasAttribute("data-log")) { bau.log = !bau.log; merke("hsr_bau", JSON.stringify(bau)); }
  else if (b.hasAttribute("data-ansicht-speichern")) {
    const name = (prompt("Name für diese Ansicht:", `${BAU_FELDER[bau.y][0]}${bau.typ === "streu" ? " gegen " + BAU_FELDER[bau.x][0] : " – Rangliste"}`) || "").trim();
    if (!name) return;
    ansichten.push({ name, ...bau }); ansichtenSpeichern(); melden("Ansicht gespeichert");
  }
  else if (b.dataset.ansichtLaden != null) { const a = ansichten[+b.dataset.ansichtLaden]; bau = { x: a.x, y: a.y, typ: a.typ, log: !!a.log }; merke("hsr_bau", JSON.stringify(bau)); }
  else if (b.dataset.ansichtWeg != null) { ansichten.splice(+b.dataset.ansichtWeg, 1); ansichtenSpeichern(); }
  else if (b.dataset.png) { png(b.closest(".kachel")); return; }
  else if (b.dataset.thumb) { thumbnailHerunterladen(b.dataset.thumb); return; }
  else return;
  zeichnen();
});
document.addEventListener("change", e => { const s = e.target.closest("#studio [data-bau]"); if (!s) return; bau[s.dataset.bau] = s.value; merke("hsr_bau", JSON.stringify(bau)); zeichnen(); });
// Layout: Knöpfe „Layout anpassen“ / „Zurücksetzen“ / Escape gehören dem Dashboard – es ruft diese Schnittstelle auf
const studioLayout = {
  umschalten() {
    if (document.body.classList.contains("bearbeiten")) { chrome.storage.local.set({ analyseLayout: layout }); layoutVorher = null; return false; }
    modul = "alle"; layoutVorher = structuredClone(layout); return true;
  },
  zuruecksetzen() { layout = structuredClone(LAYOUT_STANDARD); zeichnen(); },
  abbrechen() { layout = layoutVorher || layout; layoutVorher = null; zeichnen(); }
};
// Tooltip
const tipEl = $("s-tip");
document.addEventListener("pointermove", e => {
  const z = e.target.closest("#studio [data-tip]"); if (!z) { tipEl.classList.remove("an"); return; }
  tipEl.innerHTML = z.dataset.tip; tipEl.classList.add("an");
  const r = tipEl.getBoundingClientRect(); tipEl.style.left = Math.min(e.clientX + 14, innerWidth - r.width - 8) + "px"; tipEl.style.top = Math.min(e.clientY + 14, innerHeight - r.height - 8) + "px";
});
// PNG: Grafik der Kachel mit aufgelösten Farben auf eine Leinwand, darüber ein HandKess-Kopf
function png(kachel) {
  const svg = kachel.querySelector("svg.chart"); if (!svg) return melden("Diese Kachel hat keine Grafik");
  const kopie = svg.cloneNode(true), orig = [svg, ...svg.querySelectorAll("*")], neu = [kopie, ...kopie.querySelectorAll("*")];
  orig.forEach((o, i) => { const c = getComputedStyle(o); ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "fill-opacity", "font-size", "font-weight", "font-family", "color", "paint-order", "text-transform", "letter-spacing"].forEach(p => neu[i].style.setProperty(p, c.getPropertyValue(p))); });
  const vb = svg.viewBox.baseVal, f = 2, kopf = 60, rand = 24, W = vb.width * f + rand * 2, H = vb.height * f + kopf + rand * 2 + 26;
  kopie.setAttribute("width", vb.width * f); kopie.setAttribute("height", vb.height * f);
  const bild = new Image(), cs = getComputedStyle(document.documentElement);
  bild.onload = () => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = cs.getPropertyValue("--surface").trim() || "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#0B0B0B"; g.fillRect(0, 0, W, kopf); g.fillStyle = "#CDDE30"; g.font = "900 22px 'Arial Black', Arial"; g.fillText("HAND•KESS", rand, 39);
    g.fillStyle = "#F1F1EA"; g.font = "700 16px Arial"; g.fillText(kachel.querySelector("h2").textContent.toUpperCase() + "  ·  Social Radar", rand + 150, 38);
    g.drawImage(bild, rand, kopf + rand);
    const [pl, be] = zustand.gruppe.split(":");
    g.fillStyle = cs.getPropertyValue("--muted").trim() || "#666"; g.font = "12px Arial"; g.fillText(`${PLATTFORMEN[pl] || ""} · ${BEREICH[be] || ""} · Stand ${new Date().toLocaleDateString("de-DE")}`, rand, H - 14);
    const a = document.createElement("a"); a.download = `HandKess_${kachel.dataset.kachel}_${new Date().toISOString().slice(0, 10)}.png`; a.href = c.toDataURL("image/png"); a.click(); melden("PNG erstellt");
  };
  bild.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(kopie));
}
// Thumbnail in voller Auflösung (über den Hintergrund von i.ytimg.com, v2.2)
function thumbnailHerunterladen(id) {
  melden("Lade Thumbnail …");
  chrome.runtime.sendMessage({ typ: "thumbnail", id }, a => {
    if (chrome.runtime.lastError || !a || a.fehler) return melden(a?.fehler || "Thumbnail nicht verfügbar");
    const link = document.createElement("a"); link.href = a.bild; link.download = `Thumbnail_${id}_${a.groesse}.jpg`; link.click(); melden("Thumbnail gespeichert");
  });
}
function melden(text) { const m = $("s-toast"); m.textContent = text; m.classList.add("an"); setTimeout(() => m.classList.remove("an"), 1600); }

// Start: gespeichertes Layout, dann Daten; bei Änderungen im Speicher (Radar sammelt in anderen Tabs) neu rechnen
chrome.storage.local.get("analyseLayout").then(({ analyseLayout }) => {
  if (Array.isArray(analyseLayout)) layout = LAYOUT_STANDARD.map(s => ({ ...s, ...analyseLayout.find(l => l.id === s.id) }))
    .sort((a, b) => analyseLayout.findIndex(l => l.id === a.id) - analyseLayout.findIndex(l => l.id === b.id));
  laden();
});
let neuTimer = 0;
chrome.storage.onChanged.addListener(c => { if (Object.keys(c).some(k => /^(gespeichert|verlauf|cache:|ig:|tt:|fb:|marker|tags)/.test(k))) { clearTimeout(neuTimer); neuTimer = setTimeout(laden, 800); } });

// Schnittstelle fürs Dashboard: Studio zeigen (neu zeichnen, sobald sichtbar – vorher lassen sich Beschriftungen nicht messen)
window.RadarStudio = { zeigen() { zeichnen(); }, layout: studioLayout, neuZeichnen: () => zeichnen() };
})();
