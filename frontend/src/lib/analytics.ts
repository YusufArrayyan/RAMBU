/**
 * Event analitik anonim (PRD v4 16.2). Daftar di bawah adalah daftar lengkap yang diizinkan.
 * Id sesi acak yang berputar per tab; tanpa nilai uang, nama, atau teks bebas.
 * Menghormati Global Privacy Control, Do Not Track, dan pilihan di Saya.
 */
import { kirimPeristiwa } from "./api";

/** Properti per event: hanya nilai kategori yang aman (tanpa uang atau teks bebas). */
export interface PropertiEvent {
  app_open: { mode: "tamu" | "akun" };
  onboarding_mode_selected: { mode: "tamu" | "akun" };
  profile_saved: { has_income: "ya" | "tidak" };
  offer_calculated: { input_method: "manual" | "tempel"; segmen: string };
  telusur_opened: { besaran: string };
  kontrastif_viewed: Record<string, never>;
  kontrafaktual_viewed: { variabel: "pokok" | "cicilan_lain" | "penghasilan" | "ruang" };
  clause_viewed: { jumlah: number };
  compare_used: { jumlah: number };
  uji_paham_completed: { tepat: number };
  decision_made: { pilihan: "ambil" | "tidak_jadi" | "ubah" };
  loan_added: { sumber: "putuskan" | "manual" };
  payment_marked: { jenis: "penuh" | "sebagian" | "dinegosiasikan"; terlambat: "ya" | "tidak" };
  reminder_enabled: { aturan: string };
  notif_opened: { pemicu: string };
  help_hub_opened: { sumber: "beranda" | "saya" | "notifikasi" | "obrolan" | "lain" };
  help_contact_tapped: { jenis: "ojk" | "healing119" | "darurat" | "pesan" };
  export_data: Record<string, never>;
  delete_account: Record<string, never>;
}
export type NamaEvent = keyof PropertiEvent;

const KUNCI_OFF = "rambu-analitik-mati";

export function analitikDimatikan(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return true;
    return localStorage.getItem(KUNCI_OFF) === "1";
  } catch {
    return true;
  }
}

export function aturAnalitik(aktif: boolean) {
  try {
    if (aktif) localStorage.removeItem(KUNCI_OFF);
    else localStorage.setItem(KUNCI_OFF, "1");
  } catch {
    /* abaikan */
  }
}

export function sinyalPrivasiPeramban(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return Boolean(nav.globalPrivacyControl || nav.doNotTrack === "1");
}

function sid(): string {
  try {
    let s = sessionStorage.getItem("rambu-sid");
    if (!s) {
      const b = crypto.getRandomValues(new Uint8Array(12));
      s = Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20);
      sessionStorage.setItem("rambu-sid", s);
    }
    return s;
  } catch {
    return "tanpa-sesi";
  }
}

const sudah = new Set<string>();

export function catat<N extends NamaEvent>(nama: N, properti: PropertiEvent[N] = {} as PropertiEvent[N], sekaliPerSesi = false) {
  if (analitikDimatikan()) return;
  const kunci = `${nama}:${JSON.stringify(properti)}`;
  if (sekaliPerSesi && sudah.has(kunci)) return;
  sudah.add(kunci);
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(properti as object)) props[k] = String(v).slice(0, 40);
  kirimPeristiwa({ nama, props, sid: sid() });
}
