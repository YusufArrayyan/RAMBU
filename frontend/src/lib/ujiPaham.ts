/**
 * Penilaian uji paham (FR-24). Dinilai kode terhadap angka mesin hitung dengan
 * toleransi 2%. Tidak memblokir langkah berikutnya.
 */
import type { Hasil } from "./engine";

export const TOLERANSI = 0.02;

export type BidangUji = "diterima" | "total" | "cicilan";
export const BIDANG_UJI: BidangUji[] = ["diterima", "total", "cicilan"];

export const LABEL_UJI: Record<BidangUji, string> = {
  diterima: "Uang yang kamu terima",
  total: "Total yang harus dibayar",
  cicilan: "Cicilan per bulan",
};

export interface NilaiUji {
  bidang: BidangUji;
  jawaban: number | null;
  mesin: number;
  tepat: boolean;
  selisihPersen: number | null;
}

export function angkaMesin(h: Hasil): Record<BidangUji, number> {
  return { diterima: h.diterima, total: h.total, cicilan: h.cicilan };
}

export function nilai(jawaban: Partial<Record<BidangUji, number | null>>, h: Hasil): NilaiUji[] {
  const mesin = angkaMesin(h);
  return BIDANG_UJI.map((b) => {
    const j = jawaban[b] ?? null;
    if (j == null) return { bidang: b, jawaban: null, mesin: mesin[b], tepat: false, selisihPersen: null };
    const selisih = Math.abs(j - mesin[b]) / mesin[b];
    return { bidang: b, jawaban: j, mesin: mesin[b], tepat: selisih <= TOLERANSI + 1e-12, selisihPersen: selisih * 100 };
  });
}

export const jumlahTepat = (n: NilaiUji[]) => n.filter((x) => x.tepat).length;
