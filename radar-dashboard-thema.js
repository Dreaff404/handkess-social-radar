// HandKess Social Radar – Dashboard: Hell/Dunkel und Paper-Look vor dem ersten Zeichnen setzen (kein Aufblitzen).
// Extension-Seiten erlauben kein Inline-Skript, deshalb als eigene Datei im <head>.
try {
  const t = localStorage.getItem("hsr_theme"), l = localStorage.getItem("hsr_look");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  if (l === "paper") document.documentElement.setAttribute("data-look", "paper");
} catch { /* ohne Speicher: System-Einstellung */ }
