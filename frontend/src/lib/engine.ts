/**
 * Mesin hitung deterministik RAMBU (PRD v4 Bagian 12). Semua angka di layar berasal dari sini.
 * Fungsi murni tanpa I/O. Kembaran Python ada di backend/app/engine.py; keduanya diuji
 * dengan shared/golden.json.
 */
import { batasHarianUntuk, versiAktif, type BatasHarian, type IdSegmen, type VersiRegulasi } from "./regulasi";

export interface Masukan {
  /** P, rupiah */
  pokok: number | null;
  /** T, hari */
  tenor: number | null;
  /** r × 100 */
  bungaHarianPersen: number | null;
  /** a × 100 */
  adminPersen: number | null;
  /** I, rupiah per bulan. Kosong atau nol: rasio tidak dapat dihitung (CEK-10). */
  penghasilan?: number | null;
  /** K, rupiah per bulan */
  cicilanLain?: number | null;
  /** Segmen untuk batas harian. Bawaan konsumtif mikro/ultramikro. */
  segmen?: IdSegmen;
}

/** Posisi biaya terhadap batas harian OJK. Dua angka sampai cakupan admin jelas (CEK-07). */
export type StatusBatas =
  | "bawah_keduanya" // bunga saja dan efektif di bawah batas
  | "atas_jika_admin" // bunga saja di bawah, efektif (dengan admin) di atas
  | "atas_bunga" // bunga saja pun di atas batas
  | "belum_pasti"; // tenor > 6 bulan dan angka berada di dalam rentang batas yang belum pasti

export interface Hasil {
  bunga: number;
  admin: number;
  diterima: number;
  total: number;
  biaya: number;
  biayaPersenPokok: number;
  /** n */
  jumlahCicilan: number;
  cicilan: number;
  /** Rasio cicilan ini saja terhadap penghasilan */
  rasioSendiriPersen: number | null;
  /** Rasio cicilan ini + cicilan lain terhadap penghasilan */
  rasioPersen: number | null;
  patokanPersen: number;
  diAtasPatokan: boolean | null;
  bungaHarianPersen: number;
  efektifHarianPersen: number;
  batas: BatasHarian;
  statusBatas: StatusBatas;
  versiParameter: string;
}

const SKALA = 1_000_000;
const skala = (persen: number) => Math.round(persen * SKALA);
const EPS = 1e-9;

export function valid(m: Masukan): boolean {
  return (
    m.pokok != null &&
    Number.isFinite(m.pokok) &&
    m.pokok > 0 &&
    m.tenor != null &&
    Number.isInteger(m.tenor) &&
    m.tenor >= 1 &&
    m.bungaHarianPersen != null &&
    m.bungaHarianPersen >= 0 &&
    m.adminPersen != null &&
    m.adminPersen >= 0 &&
    m.adminPersen < 100 &&
    (m.cicilanLain ?? 0) >= 0 &&
    (m.penghasilan == null || m.penghasilan >= 0)
  );
}

export const jumlahCicilanUntuk = (tenor: number) => Math.max(1, Math.ceil(tenor / 30));

function posisiBatas(bungaHarian: number, efektif: number, batas: BatasHarian): StatusBatas {
  if (batas.tipe === "tunggal") {
    if (bungaHarian > batas.persen + EPS) return "atas_bunga";
    if (efektif > batas.persen + EPS) return "atas_jika_admin";
    return "bawah_keduanya";
  }
  if (bungaHarian > batas.maks + EPS) return "atas_bunga";
  if (efektif <= batas.min + EPS) return "bawah_keduanya";
  if (bungaHarian <= batas.min + EPS && efektif > batas.maks + EPS) return "atas_jika_admin";
  return "belum_pasti";
}

export function hitung(m: Masukan, reg: VersiRegulasi = versiAktif()): Hasil | null {
  if (!valid(m)) return null;
  const P = m.pokok!;
  const T = m.tenor!;
  const K = m.cicilanLain ?? 0;
  const I = m.penghasilan ?? 0;

  const bunga = (P * skala(m.bungaHarianPersen!) * T) / (100 * SKALA);
  const admin = (P * skala(m.adminPersen!)) / (100 * SKALA);
  const diterima = P - admin;
  const total = P + bunga;
  const biaya = total - diterima;
  const n = jumlahCicilanUntuk(T);
  const cicilan = total / n;
  const rasioSendiriPersen = I > 0 ? (cicilan / I) * 100 : null;
  const rasioPersen = I > 0 ? ((cicilan + K) / I) * 100 : null;
  const efektifHarianPersen = (biaya / (P * T)) * 100;
  const patokanPersen = reg.patokan_rasio.persen;
  const batas = batasHarianUntuk(reg, m.segmen ?? "konsumtif_mikro", T);

  return {
    bunga,
    admin,
    diterima,
    total,
    biaya,
    biayaPersenPokok: (biaya / P) * 100,
    jumlahCicilan: n,
    cicilan,
    rasioSendiriPersen,
    rasioPersen,
    patokanPersen,
    diAtasPatokan: rasioPersen === null ? null : rasioPersen > patokanPersen + EPS,
    bungaHarianPersen: m.bungaHarianPersen!,
    efektifHarianPersen,
    batas,
    statusBatas: posisiBatas(m.bungaHarianPersen!, efektifHarianPersen, batas),
    versiParameter: reg.id,
  };
}

// --- Uji tekanan (CEK-13) --------------------------------------------------------

export const PENURUNAN_UJI = [0, 10, 20, 30, 40] as const;

export interface BarisTekanan {
  penurunanPersen: number;
  penghasilan: number;
  totalCicilan: number;
  rasioPersen: number;
  diAtasPatokan: boolean;
}

/** rasio_d = (cicilan + K) / (I × (1 − d)). Kosong bila penghasilan nol. */
export function ujiTekanan(
  penghasilan: number | null | undefined,
  totalCicilan: number,
  reg: VersiRegulasi = versiAktif(),
  penurunan: readonly number[] = PENURUNAN_UJI,
): BarisTekanan[] {
  if (!penghasilan || penghasilan <= 0 || totalCicilan < 0) return [];
  const L = reg.patokan_rasio.persen;
  return penurunan.map((p) => {
    const I = (penghasilan * (100 - p)) / 100;
    const rasioPersen = (totalCicilan / I) * 100;
    return { penurunanPersen: p, penghasilan: I, totalCicilan, rasioPersen, diAtasPatokan: rasioPersen > L + EPS };
  });
}

// --- Kontrastif (PRD 6.4) ---------------------------------------------------------

export interface KontrastifRasio {
  rasioSendiriPersen: number;
  rasioPersen: number;
  /** Selisih dalam poin persentase = K ÷ I × 100 */
  selisihPoin: number;
  cicilanLain: number;
  penghasilan: number;
}

/** rasio total = rasio pinjaman ini + K ÷ I */
export function kontrastifRasio(h: Hasil, penghasilan: number | null | undefined, cicilanLain: number | null | undefined): KontrastifRasio | null {
  if (!penghasilan || penghasilan <= 0 || h.rasioPersen === null || h.rasioSendiriPersen === null) return null;
  const K = cicilanLain ?? 0;
  return { rasioSendiriPersen: h.rasioSendiriPersen, rasioPersen: h.rasioPersen, selisihPoin: (K / penghasilan) * 100, cicilanLain: K, penghasilan };
}

export interface KontrastifPenawaran {
  /** Positif: `mahal` lebih mahal dari `murah` */
  selisihBiaya: number;
  selisihBunga: number;
  selisihAdmin: number;
}

/** Δbiaya = Δbunga + Δadmin, dihitung mesin. */
export function kontrastifPenawaran(murah: Hasil, mahal: Hasil): KontrastifPenawaran {
  return {
    selisihBiaya: mahal.biaya - murah.biaya,
    selisihBunga: mahal.bunga - murah.bunga,
    selisihAdmin: mahal.admin - murah.admin,
  };
}

// --- Kontrafaktual (PRD 6.5) ------------------------------------------------------

export type Kontrafaktual =
  | { jenis: "tanpa_penghasilan" }
  | { jenis: "ruang"; ruangCicilan: number; rasioPersen: number }
  | { jenis: "tidak_ada" } // L·I − K ≤ 0: cicilan lain saja sudah melewati patokan
  | {
      jenis: "ubah";
      /** P_max dibulatkan ke bawah kelipatan Rp1.000 */
      pokokMaks: number;
      pokokMaksMentah: number;
      /** K_max = L·I − cicilan; null bila cicilan pinjaman ini saja sudah melewati patokan */
      cicilanLainMaks: number | null;
      /** I_min dibulatkan ke atas kelipatan Rp1.000 */
      penghasilanMin: number;
      penghasilanMinMentah: number;
    };

/**
 * Satu variabel pada satu waktu, syarat lain tetap; tanpa kontrafaktual tenor (K-09).
 * Pembulatan ke arah aman: pokok ke bawah, penghasilan ke atas.
 */
export function kontrafaktual(m: Masukan, h: Hasil): Kontrafaktual {
  const I = m.penghasilan ?? 0;
  if (!I || I <= 0 || h.rasioPersen === null) return { jenis: "tanpa_penghasilan" };
  const K = m.cicilanLain ?? 0;
  const batasRupiah = (I * h.patokanPersen) / 100; // L·I
  if (!h.diAtasPatokan) return { jenis: "ruang", ruangCicilan: batasRupiah - (h.cicilan + K), rasioPersen: h.rasioPersen };
  if (batasRupiah - K <= 0) return { jenis: "tidak_ada" };
  const r = (m.bungaHarianPersen ?? 0) / 100;
  const T = m.tenor!;
  const n = h.jumlahCicilan;
  const pokokMaksMentah = ((batasRupiah - K) * n) / (1 + r * T);
  const kMaks = batasRupiah - h.cicilan;
  const penghasilanMinMentah = ((h.cicilan + K) * 100) / h.patokanPersen;
  return {
    jenis: "ubah",
    pokokMaks: Math.floor(pokokMaksMentah / 1000 + EPS) * 1000,
    pokokMaksMentah,
    cicilanLainMaks: kMaks >= 0 ? Math.floor(kMaks + EPS) : null,
    penghasilanMin: Math.ceil(penghasilanMinMentah / 1000 - EPS) * 1000,
    penghasilanMinMentah,
  };
}
