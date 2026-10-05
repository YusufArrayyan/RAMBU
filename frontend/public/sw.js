// Service Worker RAMBU (NFR-03): Cek dan Pinjamanku tetap bekerja tanpa jaringan setelah pemuatan pertama.
// - Navigasi: jaringan dulu, cadangan index.html dari cache (SPA).
// - Aset build (/assets/*, ikon, fon): cache dulu, karena namanya memuat hash.
// - /api/*: tidak pernah di-cache. Data pengguna tidak pernah disimpan di cache ini.
const VERSI = "rambu-v4-2";
// Saat pengembangan (didaftarkan dengan ?mode=dev hanya untuk notifikasi), jangan mencache apa pun.
const DEV = new URL(self.location.href).searchParams.get("mode") === "dev";
const INTI = ["/", "/index.html", "/manifest.webmanifest", "/theme-init.js", "/logo-mark-128.png", "/logo-mark.png", "/favicon-32.png", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(DEV ? self.skipWaiting() : caches.open(VERSI).then((c) => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (DEV || req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const salin = res.clone();
          caches.open(VERSI).then((c) => c.put("/index.html", salin));
          return res;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (ada) =>
        ada ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith("/assets/") || /\.(png|ico|woff2|svg|webmanifest)$/.test(url.pathname))) {
            const salin = res.clone();
            caches.open(VERSI).then((c) => c.put(req, salin));
          }
          return res;
        }),
    ),
  );
});

// --- Web Push (ING-05). Isi sudah mengikuti mode privasi dari server: tanpa jumlah bila privasi hidup.
self.addEventListener("push", (e) => {
  let d = { judul: "RAMBU", isi: "Ada pengingat cicilan. Buka RAMBU untuk melihat.", url: "/saya/notifikasi", tag: "rambu" };
  try {
    d = { ...d, ...e.data.json() };
  } catch {
    /* pakai teks bawaan */
  }
  e.waitUntil(self.registration.showNotification(d.judul, { body: d.isi, tag: d.tag, icon: "/icon-192.png", badge: "/favicon-32.png", data: { url: d.url }, lang: "id" }));
});

// Mengetuk notifikasi membuka alasan pengingat itu (XAI-07).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const tujuan = new URL(e.notification.data?.url || "/saya/notifikasi", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      const ada = ws.find((w) => w.url.startsWith(self.location.origin));
      if (ada) return ada.navigate(tujuan).then((w) => (w || ada).focus());
      return self.clients.openWindow(tujuan);
    }),
  );
});
