/**
 * Parameter regulasi berversi (PRD v4 Bagian 12.1), dibaca dari shared/regulasi.json.
 * Setiap parameter membawa sumber dan status. Parameter tanpa sumber tidak dipakai.
 */
import berkas from "@shared/regulasi.json";

export type StatusParameter = "terverifikasi" | "asumsi" | "perlu_data" | "nonaktif";
export type JenisPinjaman = "konsumtif" | "produktif";
export type IdSegmen = "konsumtif_mikro" | "konsumtif_kecil" | "produktif";

export interface Segmen {
  id: IdSegmen;
  jenis: JenisPinjaman;
  label: string;
}

export interface BarisBatasHarian {
  id: string;
  segmen: IdSegmen | "semua";
  tenor_maks_hari: number | null;
  persen?: number;
  persen_min?: number;
  persen_maks?: number;
  sumber: string;
  status: StatusParameter;
}

export interface VersiRegulasi {
  id: string;
  berlaku_mulai: string;
  diterbitkan: string;
  status: string;
  pengaju: string;
  penyetuju: string;
  segmen: Segmen[];
  batas_harian: BarisBatasHarian[];
  admin_termasuk_batas: { nilai: boolean | null; sumber: string; status: StatusParameter; catatan: string };
  patokan_rasio: { persen: number; sumber: string; status: StatusParameter; cakupan_status: StatusParameter; catatan: string };
  nonaktif: { nama: string; alasan: string }[];
}

export interface KanalPengaduan {
  nama: string;
  telepon: string;
  whatsapp: string;
  email: string;
  url: string;
}

const KUNCI_SERVER = "rambu-regulasi-server";
const urut = (vs: VersiRegulasi[]) => [...vs].sort((a, b) => a.berlaku_mulai.localeCompare(b.berlaku_mulai) || (a.diterbitkan ?? "").localeCompare(b.diterbitkan ?? ""));

function gabung(server: VersiRegulasi[]): VersiRegulasi[] {
  const per = new Map<string, VersiRegulasi>((berkas.versi as VersiRegulasi[]).map((v) => [v.id, v]));
  for (const v of server) if (v && v.id && Array.isArray(v.batas_harian) && v.patokan_rasio) per.set(v.id, v);
  return urut([...per.values()]);
}

function muatCacheServer(): VersiRegulasi[] {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_SERVER) ?? "[]") as VersiRegulasi[];
  } catch {
    return [];
  }
}

/** Versi dari berkas yang dibundel, ditambah versi terbit dari server (dua orang) yang tersimpan untuk offline. */
export let semuaVersi: VersiRegulasi[] = gabung(typeof localStorage === "undefined" ? [] : muatCacheServer());
export const kanalPengaduan: KanalPengaduan = berkas.kanal_pengaduan;

/** Pasang versi terbit dari /api/regulasi. Kembalikan true bila versi aktif berubah. */
export function pasangVersiServer(server: VersiRegulasi[]): boolean {
  const sebelum = versiAktif().id;
  semuaVersi = gabung(server.filter((v) => v.status === "terbit"));
  try {
    localStorage.setItem(KUNCI_SERVER, JSON.stringify(server.filter((v) => v.status === "terbit")));
  } catch {
    /* abaikan */
  }
  return versiAktif().id !== sebelum;
}

function isoHariIni(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Versi terbit terbaru yang tanggal berlakunya tidak melewati `pada` (YYYY-MM-DD). */
export function versiAktif(pada: string = isoHariIni()): VersiRegulasi {
  const terbit = semuaVersi.filter((v) => v.status === "terbit");
  const aktif = terbit.filter((v) => v.berlaku_mulai <= pada);
  return aktif.length ? aktif[aktif.length - 1] : terbit[0];
}

/** Batas harian untuk segmen dan tenor. Tenor > 180 hari memakai baris rentang (status perlu data). */
export type BatasHarian =
  | { tipe: "tunggal"; persen: number; baris: BarisBatasHarian }
  | { tipe: "rentang"; min: number; maks: number; baris: BarisBatasHarian };

export function batasHarianUntuk(reg: VersiRegulasi, segmen: IdSegmen, tenor: number): BatasHarian {
  const cocok = reg.batas_harian.find(
    (b) => b.status !== "nonaktif" && (b.segmen === segmen || b.segmen === "semua") && (b.tenor_maks_hari === null || tenor <= b.tenor_maks_hari),
  );
  const baris = cocok ?? reg.batas_harian[reg.batas_harian.length - 1];
  if (baris.persen !== undefined) return { tipe: "tunggal", persen: baris.persen, baris };
  return { tipe: "rentang", min: baris.persen_min!, maks: baris.persen_maks!, baris };
}

export const segmenUntuk = (reg: VersiRegulasi, id: IdSegmen) => reg.segmen.find((s) => s.id === id) ?? reg.segmen[0];

/** Tenor terpanjang untuk baris batas tunggal (dipakai di teks "tenor sampai 180 hari"). */
export function ambangTenor(reg: VersiRegulasi): number {
  return reg.batas_harian.find((b) => b.tenor_maks_hari !== null)?.tenor_maks_hari ?? 180;
}

export const LABEL_STATUS: Record<StatusParameter, string> = {
  terverifikasi: "Terverifikasi",
  asumsi: "Asumsi",
  perlu_data: "Perlu data",
  nonaktif: "Nonaktif",
};
