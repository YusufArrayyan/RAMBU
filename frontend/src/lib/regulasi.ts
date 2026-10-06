/**
 * Parameter regulasi berversi (PRD v4 Bagian 12.1), dibaca dari shared/regulasi.json.
 * Setiap parameter membawa sumber dan status. Parameter tanpa sumber tidak dipakai.
 */
import berkas from "@shared/regulasi.json";
import { rupiah } from "./format";

export type StatusParameter = "terverifikasi" | "asumsi" | "perlu_data" | "nonaktif";
export type JenisPinjaman = "konsumtif" | "produktif";
export type IdSegmen = "konsumtif" | "produktif";

/** Id segmen lama (versi 2026.10.1) yang mungkin masih tersimpan di perangkat. */
export function normalSegmen(s: unknown): IdSegmen {
  return s === "produktif" ? "produktif" : "konsumtif";
}

export interface Segmen {
  id: IdSegmen;
  jenis: JenisPinjaman;
  label: string;
}

export interface BarisBatasHarian {
  id: string;
  segmen: IdSegmen | "semua";
  /** Batas atas nilai pinjaman untuk baris ini (rupiah); kosong: semua nilai. */
  pokok_maks?: number | null;
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
  /** Batas seluruh manfaat ekonomi dan denda terhadap nilai pinjaman. */
  batas_total?: { persen: number; sumber: string; status: StatusParameter; catatan: string };
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

export function batasHarianUntuk(reg: VersiRegulasi, segmen: IdSegmen, tenor: number, pokok = 0): BatasHarian {
  const cocok = reg.batas_harian.find(
    (b) =>
      b.status !== "nonaktif" &&
      (b.segmen === segmen || b.segmen === "semua") &&
      (b.pokok_maks == null || pokok <= b.pokok_maks) &&
      (b.tenor_maks_hari === null || tenor <= b.tenor_maks_hari),
  );
  const baris = cocok ?? reg.batas_harian[reg.batas_harian.length - 1];
  if (baris.persen !== undefined) return { tipe: "tunggal", persen: baris.persen, baris };
  return { tipe: "rentang", min: baris.persen_min!, maks: baris.persen_maks!, baris };
}

export const segmenUntuk = (reg: VersiRegulasi, id: IdSegmen) => reg.segmen.find((s) => s.id === id) ?? reg.segmen[0];

/** Admin dihitung dalam batas harian? Bila belum pasti, RAMBU menampilkan dua angka (CEK-07). */
export const adminTermasuk = (reg: VersiRegulasi) => reg.admin_termasuk_batas.nilai === true;

/** "Konsumtif, tenor sampai 6 bulan", "Produktif di atas Rp50.000.000, semua tenor", dst. */
export function labelBaris(reg: VersiRegulasi, b: BarisBatasHarian): string {
  const seg = b.segmen === "semua" ? "Semua jenis" : (reg.segmen.find((s) => s.id === b.segmen)?.label.split(" (")[0] ?? b.segmen);
  const sebelum = reg.batas_harian.slice(0, reg.batas_harian.indexOf(b)).filter((x) => x.segmen === b.segmen);
  const plafonSebelum = Math.max(0, ...sebelum.map((x) => x.pokok_maks ?? 0));
  const nilai = b.pokok_maks != null ? ` sampai ${rupiah(b.pokok_maks)}` : plafonSebelum ? ` di atas ${rupiah(plafonSebelum)}` : "";
  const adaPendek = sebelum.some((x) => (x.pokok_maks ?? null) === (b.pokok_maks ?? null) && x.tenor_maks_hari !== null);
  const tenor = b.tenor_maks_hari !== null ? `tenor sampai ${Math.round(b.tenor_maks_hari / 30)} bulan` : adaPendek ? "tenor lebih dari 6 bulan" : "semua tenor";
  return `${seg}${nilai}, ${tenor}`;
}

/** Keterangan singkat patokan rasio, mengikuti status cakupannya di versi parameter. */
export function teksPatokan(reg: VersiRegulasi): string {
  const p = reg.patokan_rasio;
  return p.cakupan_status === "terverifikasi"
    ? `Patokan ${p.persen}% adalah batas yang dipakai penyelenggara saat menilai kemampuan bayar, dihitung dari cicilan ke seluruh kreditur (${p.sumber.replace(/ Romawi.*$/, "")}).`
    : `Patokan ${p.persen}%, bukan batas hukum. Cakupannya (seluruh kreditur atau per penyelenggara) masih diverifikasi.`;
}

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
