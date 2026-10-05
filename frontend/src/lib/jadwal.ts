/**
 * Pinjamanku dan Jadwal (PRD v4 7.5, 7.6, PIN-xx, JDW-xx). Fungsi murni.
 * Tanggal disimpan sebagai string lokal YYYY-MM-DD (NFR-09: tanggal jatuh tempo memakai tanggal lokal).
 */

export type StatusCicilan = "terjadwal" | "mendekati" | "jatuh_tempo" | "terlambat" | "dinegosiasikan" | "dibayar" | "dibayar_terlambat";
export type JenisBayar = "penuh" | "sebagian" | "dinegosiasikan";

export interface Cicilan {
  id: string;
  ke: number;
  jatuhTempo: string;
  jumlah: number;
}

export interface Pembayaran {
  id: string;
  cicilanId: string;
  tanggal: string;
  jumlah: number;
  jenis: JenisBayar;
}

export interface RingkasCek {
  pokok: number;
  tenor: number;
  bungaHarianPersen: number;
  adminPersen: number;
  diterima: number;
  total: number;
  biaya: number;
  efektifHarianPersen: number;
  versiParameter: string;
}

export interface Pinjaman {
  id: string;
  nama: string;
  penyelenggara?: string;
  cicilan: Cicilan[];
  pembayaran: Pembayaran[];
  asal: "putuskan" | "manual";
  /** Hasil Cek yang menjadi asal pinjaman, bila ada (untuk telusur biaya di S18) */
  cek?: RingkasCek;
  dibuat: string;
}

// --- Tanggal ---------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");
export const keIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dariIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const hariIni = () => keIso(new Date());

/** Selisih hari kalender b − a. */
export function selisihHari(a: string, b: string): number {
  return Math.round((dariIso(b).getTime() - dariIso(a).getTime()) / 86_400_000);
}

export function tambahHari(iso: string, hari: number): string {
  const d = dariIso(iso);
  d.setDate(d.getDate() + hari);
  return keIso(d);
}

/** Tanggal yang sama pada bulan ke-`k` setelah `iso`; dipotong ke akhir bulan (31 Jan → 28/29 Feb). */
export function tambahBulan(iso: string, k: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + k, 1);
  const akhir = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, akhir));
  return keIso(target);
}

// Nama bulan dan hari dari Intl (id-ID), bukan daftar yang ditulis tangan.
const bulanKe = (opsi: Intl.DateTimeFormatOptions) => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("id-ID", opsi).format(new Date(2026, i, 1)));
export const BULAN = bulanKe({ month: "short" });
export const BULAN_PANJANG = bulanKe({ month: "long" });
// 2026-10-04 adalah hari Minggu
export const HARI = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(new Date(2026, 9, 4 + i)));

const fmtPendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const fmtPanjang = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** "12 Okt" */
export const tglPendek = (iso: string) => fmtPendek.format(dariIso(iso));
/** "12 Oktober 2026" */
export const tglPanjang = (iso: string) => fmtPanjang.format(dariIso(iso));
/** "2026-10" */
export const kunciBulan = (iso: string) => iso.slice(0, 7);

// --- Jadwal ----------------------------------------------------------------------

const idBaru = () => Math.random().toString(36).slice(2, 10);

/**
 * Jadwal bulanan di tanggal yang sama (PIN-02). Bila `total` diberikan dan tidak habis dibagi,
 * cicilan dibulatkan ke rupiah terdekat dan selisih ditanggung cicilan terakhir (12.3).
 */
export function buatJadwal(opsi: { cicilanPerKali: number; jumlahCicilan: number; jatuhTempoPertama: string; total?: number }): Cicilan[] {
  const n = Math.max(1, Math.floor(opsi.jumlahCicilan));
  const per = opsi.total !== undefined ? Math.round(opsi.total / n) : Math.round(opsi.cicilanPerKali);
  return Array.from({ length: n }, (_, i) => ({
    id: idBaru(),
    ke: i + 1,
    jatuhTempo: tambahBulan(opsi.jatuhTempoPertama, i),
    jumlah: opsi.total !== undefined && i === n - 1 ? Math.round(opsi.total) - per * (n - 1) : per,
  }));
}

export interface InfoCicilan {
  cicilan: Cicilan;
  status: StatusCicilan;
  dibayar: number;
  sisa: number;
  /** Hari menuju jatuh tempo (negatif bila lewat) */
  hariLagi: number;
}

/** Tujuh status dihitung dari tanggal dan catatan (PIN-07). Tidak disimpan sebagai kolom. */
export function infoCicilan(c: Cicilan, pembayaran: Pembayaran[], hari: string = hariIni()): InfoCicilan {
  const milik = pembayaran.filter((p) => p.cicilanId === c.id);
  const dibayar = milik.reduce((s, p) => s + p.jumlah, 0);
  const sisa = Math.max(0, c.jumlah - dibayar);
  const hariLagi = selisihHari(hari, c.jatuhTempo);
  let status: StatusCicilan;
  if (sisa <= 0.5 && milik.length) {
    const terakhir = milik.map((p) => p.tanggal).sort().at(-1)!;
    status = terakhir <= c.jatuhTempo ? "dibayar" : "dibayar_terlambat";
  } else if (milik.some((p) => p.jenis === "dinegosiasikan")) status = "dinegosiasikan";
  else if (hariLagi > 3) status = "terjadwal";
  else if (hariLagi > 0) status = "mendekati";
  else if (hariLagi === 0) status = "jatuh_tempo";
  else status = "terlambat";
  return { cicilan: c, status, dibayar, sisa, hariLagi };
}

export const sudahDibayar = (s: StatusCicilan) => s === "dibayar" || s === "dibayar_terlambat";

export interface InfoPinjaman {
  pinjaman: Pinjaman;
  cicilan: InfoCicilan[];
  sisaKewajiban: number;
  totalKewajiban: number;
  jumlahDibayar: number;
  berikutnya: InfoCicilan | null;
  selesai: boolean;
}

export function infoPinjaman(p: Pinjaman, hari: string = hariIni()): InfoPinjaman {
  const cicilan = [...p.cicilan].sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo)).map((c) => infoCicilan(c, p.pembayaran, hari));
  const totalKewajiban = cicilan.reduce((s, c) => s + c.cicilan.jumlah, 0);
  const sisaKewajiban = cicilan.reduce((s, c) => s + c.sisa, 0);
  const belum = cicilan.filter((c) => !sudahDibayar(c.status));
  return {
    pinjaman: p,
    cicilan,
    sisaKewajiban,
    totalKewajiban,
    jumlahDibayar: cicilan.filter((c) => sudahDibayar(c.status)).length,
    berikutnya: belum[0] ?? null,
    selesai: belum.length === 0, // PIN-09
  };
}

/** Semua cicilan belum dibayar dari banyak pinjaman, urut tanggal. */
export function cicilanBerikutnya(daftar: Pinjaman[], hari: string = hariIni()) {
  return daftar
    .flatMap((p) => infoPinjaman(p, hari).cicilan.filter((c) => !sudahDibayar(c.status)).map((c) => ({ ...c, pinjaman: p })))
    .sort((a, b) => a.cicilan.jatuhTempo.localeCompare(b.cicilan.jatuhTempo));
}

// --- Ringkasan bulanan (JDW-02, JDW-04, XAI-06) -------------------------------

export interface BulanRingkas {
  kunci: string;
  label: string;
  total: number;
  sudahDitandai: number;
  jumlahJatuhTempo: number;
  rasioPersen: number | null;
  perPinjaman: { id: string; nama: string; jumlah: number }[];
}

export function ringkasanBulan(daftar: Pinjaman[], kunci: string, penghasilan: number | null, hari: string = hariIni()): BulanRingkas {
  const [y, m] = kunci.split("-").map(Number);
  const per = new Map<string, { id: string; nama: string; jumlah: number }>();
  let total = 0;
  let sudah = 0;
  let jumlah = 0;
  for (const p of daftar) {
    for (const c of infoPinjaman(p, hari).cicilan) {
      if (kunciBulan(c.cicilan.jatuhTempo) !== kunci) continue;
      total += c.cicilan.jumlah;
      jumlah += 1;
      if (sudahDibayar(c.status)) sudah += c.cicilan.jumlah;
      const e = per.get(p.id) ?? { id: p.id, nama: p.nama, jumlah: 0 };
      e.jumlah += c.cicilan.jumlah;
      per.set(p.id, e);
    }
  }
  return {
    kunci,
    label: `${BULAN[m - 1]} ${y}`,
    total,
    sudahDitandai: sudah,
    jumlahJatuhTempo: jumlah,
    rasioPersen: penghasilan && penghasilan > 0 ? (total / penghasilan) * 100 : null,
    perPinjaman: [...per.values()],
  };
}

export function ringkasanBeberapaBulan(daftar: Pinjaman[], mulai: string, jumlahBulan: number, penghasilan: number | null, hari: string = hariIni()): BulanRingkas[] {
  return Array.from({ length: jumlahBulan }, (_, i) => ringkasanBulan(daftar, kunciBulan(tambahBulan(`${mulai.slice(0, 7)}-01`, i)), penghasilan, hari));
}

/** Kontrastif antar bulan: pinjaman yang berhenti atau mulai di antara dua bulan. Δ = Σ selisih ÷ I. */
export function kontrastifBulan(a: BulanRingkas, b: BulanRingkas, penghasilan: number | null) {
  const idA = new Map(a.perPinjaman.map((p) => [p.id, p]));
  const idB = new Map(b.perPinjaman.map((p) => [p.id, p]));
  const selesai = a.perPinjaman.filter((p) => !idB.has(p.id));
  const mulai = b.perPinjaman.filter((p) => !idA.has(p.id));
  const selisih = b.total - a.total;
  return {
    selesai,
    mulai,
    selisih,
    selisihPoin: penghasilan && penghasilan > 0 ? (selisih / penghasilan) * 100 : null,
  };
}

// --- Kartu lembut (BTN-03) -----------------------------------------------------

/**
 * Pemicu kartu lembut di Beranda: 2 cicilan terlambat, atau rasio di atas ambang.
 * Ambang rasio ditetapkan bersama psikolog klinis (PERLU DATA); sementara memakai null (tidak aktif).
 */
export const AMBANG_RASIO_KARTU_LEMBUT: number | null = null;

export function pemicuKartuLembut(daftar: Pinjaman[], rasioBulanIni: number | null, hari: string = hariIni()): boolean {
  const terlambat = daftar.flatMap((p) => infoPinjaman(p, hari).cicilan).filter((c) => c.status === "terlambat").length;
  if (terlambat >= 2) return true;
  return AMBANG_RASIO_KARTU_LEMBUT !== null && rasioBulanIni !== null && rasioBulanIni > AMBANG_RASIO_KARTU_LEMBUT;
}
