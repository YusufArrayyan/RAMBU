/**
 * Web Push untuk mode akun (ING-05, ING-07). Izin hanya diminta saat pengguna menyalakan
 * Notifikasi. Di iOS, push hanya bekerja bila RAMBU dipasang ke Layar Utama (iOS 16.4+).
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

function keUint8(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushDidukung(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registrasi(): Promise<ServiceWorkerRegistration> {
  // Produksi: Service Worker sudah terdaftar untuk offline. Pengembangan: daftar mode tanpa cache.
  const ada = await navigator.serviceWorker.getRegistration("/");
  if (ada) return ada;
  return navigator.serviceWorker.register(import.meta.env.PROD ? "/sw.js" : "/sw.js?mode=dev");
}

export class GalatPush extends Error {}

export async function aktifkanPush(token: string): Promise<void> {
  if (!pushDidukung()) throw new GalatPush("Peramban ini tidak mendukung notifikasi push. Email tetap bisa dipakai.");
  const izin = await Notification.requestPermission();
  if (izin !== "granted") throw new GalatPush("Izin notifikasi tidak diberikan. Kamu bisa mengubahnya di pengaturan peramban.");
  const kunci = await fetch(`${BASE}/api/akun/push/kunci`).then((r) => (r.ok ? r.json() : Promise.reject(new GalatPush("Notifikasi push belum dikonfigurasi di server ini."))));
  const reg = await registrasi();
  await navigator.serviceWorker.ready;
  const langganan = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keUint8(kunci.kunci_publik) }));
  const res = await fetch(`${BASE}/api/akun/push/langganan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(langganan.toJSON()),
  });
  if (!res.ok) throw new GalatPush("Langganan notifikasi belum tersimpan. Coba lagi.");
}

/** Matikan push di perangkat ini dan cabut langganan di server (PRD 14.1: token push dihapus). */
export async function matikanPush(token: string | null): Promise<void> {
  if (pushDidukung()) {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const lg = await reg?.pushManager.getSubscription();
    await lg?.unsubscribe().catch(() => false);
  }
  if (token) await fetch(`${BASE}/api/akun/push/langganan`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}
