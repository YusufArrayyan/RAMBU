/**
 * Klien API. Tahap 1 tidak bergantung pada server: semua hitungan berjalan di perangkat.
 * Server hanya dipakai untuk konfigurasi, analitik anonim, dan fitur AI tahap 2.
 */
import type { Masukan } from "./engine";
import type { KanalPengaduan, VersiRegulasi } from "./regulasi";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 15000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      let pesan = "Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.";
      try {
        const body = await res.json();
        if (typeof body.detail === "string") pesan = body.detail;
      } catch {
        /* abaikan */
      }
      throw new ApiError(pesan, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Tidak ada koneksi ke server RAMBU. Hitungan di perangkatmu tetap berjalan.", 0);
  } finally {
    clearTimeout(t);
  }
}

export interface KonfigServer {
  ai_tersedia: boolean;
  akun_tersedia: boolean;
  push_tersedia: boolean;
  regulasi_aktif: VersiRegulasi;
  kanal_pengaduan: KanalPengaduan;
}

export const ambilKonfig = () => request<KonfigServer>("/api/config", { timeoutMs: 5000 });
export const ambilRegulasi = () => request<{ aktif: string; versi: VersiRegulasi[] }>("/api/regulasi", { timeoutMs: 5000 });

function keBody(m: Masukan) {
  return {
    pokok: m.pokok,
    tenor: m.tenor,
    bunga_harian_persen: m.bungaHarianPersen,
    admin_persen: m.adminPersen,
    penghasilan: m.penghasilan ?? null,
    cicilan_lain: m.cicilanLain ?? 0,
    segmen: m.segmen ?? "konsumtif_mikro",
  };
}

export interface Penjelasan {
  teks: string;
  sumber: "ai" | "templat";
  /** Mengapa penjelasan AI tidak dipakai: ditolak pemeriksa angka/kalimat, layanan gagal, atau AI nonaktif. */
  penolakan: "pemeriksa" | "layanan" | "nonaktif" | null;
  alasan: string[];
}

export const mintaPenjelasan = (m: Masukan) =>
  request<Penjelasan>("/api/ai/jelaskan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(keBody(m)),
    timeoutMs: 60000,
  });

// --- Baca dokumen (FR-16, FR-17) ------------------------------------------------

export interface AngkaTerverifikasi {
  /** Sudah dikonversi ke satuan RAMBU: rupiah, hari, persen per hari, persen dari pokok. */
  nilai: number;
  nilai_tertulis: number;
  satuan_tertulis: string;
  kutipan: string;
  catatan: string | null;
}

export interface Klausul {
  kategori: string;
  judul: string;
  kutipan: string;
  penjelasan: string;
  rujukan: string;
}

export interface HasilBacaDokumen {
  angka: Record<"pokok" | "tenor" | "bunga" | "admin", AngkaTerverifikasi | null>;
  angka_ditolak: { bidang: string; alasan: string }[];
  klausul: Klausul[];
  klausul_dibuang: number;
  label: string;
}

const json = (body: unknown, timeoutMs = 90000): RequestInit & { timeoutMs: number } => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
  timeoutMs,
});

export const bacaDokumen = (teks: string) => request<HasilBacaDokumen>("/api/ai/baca-dokumen", json({ teks }));

export async function salinGambar(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("gambar", file);
  const r = await request<{ teks: string }>("/api/ai/salin-gambar", { method: "POST", body: fd, timeoutMs: 90000 });
  return r.teks;
}

// --- Pewawancara cicilan (FR-23) ------------------------------------------------

export interface KewajibanApi {
  id: string;
  nama: string;
  cicilan_per_bulan: number;
  sisa_bulan: number;
  sumber: "manual" | "ai";
}

export interface HasilAlat {
  alat: "catat_kewajiban" | "hitung" | string;
  masukan: Record<string, unknown>;
  keluaran: Record<string, unknown>;
  galat: boolean;
}

export interface GiliranWawancara {
  balasan: string;
  sumber: "ai" | "ditolak";
  alasan: string[];
  kewajiban: KewajibanApi[];
  kewajiban_baru: string[];
  hasil_alat: HasilAlat[];
}

export const wawancara = (body: {
  pesan: { peran: "pengguna" | "asisten"; teks: string }[];
  kewajiban: KewajibanApi[];
  penghasilan: number | null;
  cicilan_penawaran: number;
}) => request<GiliranWawancara>("/api/ai/wawancara", json(body));

// --- Uji paham (FR-24) ----------------------------------------------------------

export interface HasilBacaJawaban {
  angka: Record<"diterima" | "total" | "cicilan", { nilai: number; kutipan: string } | null>;
  ditolak: string[];
}

export const bacaJawaban = (teks: string) => request<HasilBacaJawaban>("/api/ai/baca-jawaban", json({ teks }, 60000));

export interface RingkasanAdmin {
  rentang_hari: number;
  total_sesi: number;
  corong: { layar: string; sesi: number; proporsi: number }[];
  penyelesaian: { mencapai_hasil: number; mencapai_putuskan: number };
  peristiwa: { nama: string; jumlah: number }[];
  harian: { tanggal: string; sesi: number }[];
  catatan: string;
}

export const ambilRingkasan = (token: string, hari: number) =>
  request<RingkasanAdmin>(`/api/admin/ringkasan?hari=${hari}`, { headers: { Authorization: `Bearer ${token}` } });

export function kirimPeristiwa(body: { nama: string; props: Record<string, string>; sid: string }) {
  const url = `${BASE}/api/events`;
  const data = JSON.stringify(body);
  // keepalive agar peristiwa tetap terkirim saat berpindah halaman; kegagalan diabaikan.
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: data, keepalive: true }).catch(
    () => {},
  );
}
