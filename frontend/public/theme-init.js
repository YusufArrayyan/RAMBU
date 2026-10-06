// Dijalankan sebelum render agar tidak ada kilatan tema yang salah.
(function () {
  try {
    var pref = localStorage.getItem("rambu-tema") || "terang";
    var dark = pref === "gelap" || (pref === "sistem" && matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0b1220" : "#f8fafc");
  } catch (e) {}
})();
