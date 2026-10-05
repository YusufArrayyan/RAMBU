/** Klien API panel Admin RAMBU dan Mitra (PRD v4 Bagian 9). Token disimpan per tab. */
import type { VersiRegulasi } from "./regulasi";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const KUNCI = "rambu-admin-token";

export const tokenAdmin = {
  get: () => sessionStorage.getItem(KUNCI),
  set: (t: string) => sessionStorage.setItem(KUNCI, t),
  hapus: () => sessionStorage.removeItem(KUNCI),
};

export class GalatAdmin extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function panggilAdmin<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = tokenAdmin.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new GalatAdmin("Server RAMBU tidak bisa dihubungi.", 0);
  }
  if (!res.ok) {
    let pesan = "Permintaan gagal.";
    try {
      const b = await res.json();
      if (typeof b.detail === "string") pesan = b.detail;
      else if (Array.isArray(b.detail)) pesan = "Isian belum valid. Periksa lagi kolomnya.";
    } catch {
      /* abaikan */
    }
    throw new GalatAdmin(pesan, res.status);
  }
  return (await res.json()) as T;
}

export type Peran = "penyunting" | "peninjau" | "analis" | "superadmin" | "mitra";
export const LABEL_PERAN: Record<Peran, string> = { penyunting: "Penyunting", peninjau: "Peninjau", analis: "Analis", superadmin: "Superadmin", mitra: "Mitra" };

export interface Saya {
  nama: string;
  peran: Peran;
  izin: string[];
  data_contoh: boolean;
}

export interface Dasbor {
  versi_aktif: { id: string; diterbitkan: string | null };
  menunggu: { jumlah: number; terbaru: string | null };
  ai_ditolak: { ditolak: number; total: number };
  uji_paham: { selesai: number; cek: number; proporsi: number | null };
  penolakan_per_hari: { tanggal: string; ditolak: number }[];
  penyebab_terbanyak: string | null;
  aktivitas: EntriAudit[];
  data_contoh: boolean;
}

export interface EntriAudit {
  waktu: string;
  aktor: string;
  peran: string;
  aksi: string;
  objek: string;
  detail: string;
}

export interface VersiParameterAdmin {
  id: number;
  versi: string;
  status: "draf" | "menunggu" | "terbit" | "ditolak" | "arsip";
  catatan: string;
  isi: VersiRegulasi;
  pengaju: string | null;
  pengaju_id: number | null;
  penyetuju: string | null;
  dibuat: string;
  diputus: string | null;
}

export interface KlausulAdmin {
  id: number;
  kategori: string;
  judul: string;
  penjelasan: string;
  rujukan: string;
  contoh_kutipan: string;
  status: "draf" | "ditinjau" | "terbit";
  diubah: string;
  diubah_oleh: string;
}

export interface LogPemeriksa {
  baris: { waktu: string; jenis: string; hasil: "lolos" | "ditolak"; alasan: string; kode: string }[];
  ringkas: { total: number; ditolak: number; per_alasan: { alasan: string; jumlah: number }[]; per_jenis: { jenis: string; jumlah: number }[] };
  catatan: string;
}

export interface AdminPengguna {
  id: number;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  dibuat: string;
}

export interface LaporanMitra {
  rentang_hari: number;
  k_minimum: number;
  pengguna_aktif: number | null;
  sesi_cek: number | null;
  uji_paham_selesai_persen: number | null;
  sebaran_uji_paham: Record<"0" | "1" | "2" | "3", number | null>;
  keputusan: Record<"ambil" | "tidak_jadi" | "ubah", number | null> | null;
  per_segmen: Record<string, number | null>;
  pengguna_dengan_pinjaman: number | null;
  di_atas_patokan_persen: number | null;
  sebaran_rasio: { rentang: string; persen: number | null }[] | null;
  contoh: { pengguna_aktif: number; uji_paham_selesai_persen: number; di_atas_patokan_persen: number; sebaran_rasio: { rentang: string; persen: number }[]; periode: string } | null;
  catatan: string;
}

export const JENIS_LOG: Record<string, string> = { baca_dokumen: "Baca dokumen", obrolan: "Obrolan cicilan", uji_paham: "Uji paham", penjelasan: "Penjelasan" };
export const AKSI: Record<string, string> = {
  terbitkan_parameter: "Parameter diterbitkan",
  ajukan_parameter: "Perubahan parameter diajukan",
  simpan_draf_parameter: "Draf parameter disimpan",
  tolak_parameter: "Perubahan parameter ditolak",
  sunting_klausul: "Konten klausul disunting",
  klausul_ditinjau: "Konten klausul diajukan untuk ditinjau",
  klausul_terbit: "Konten klausul diterbitkan",
  klausul_draf: "Konten klausul dikembalikan ke draf",
  tambah_admin: "Admin ditambahkan",
  aktifkan_admin: "Admin diaktifkan",
  nonaktifkan_admin: "Admin dinonaktifkan",
};
