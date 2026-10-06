/**
 * Telusur (XAI-01). Rumus yang tampil dirakit dari masukan dan Hasil yang sama yang
 * dipakai layar, sehingga bila angka berubah, rumusnya ikut berubah.
 */
import type { Hasil, Masukan } from "./engine";
import { angka, persen, rupiah } from "./format";
import { teksPatokan, versiAktif } from "./regulasi";

export type Besaran = "diterima" | "total" | "biaya" | "cicilan" | "rasio" | "efektif";

export interface Telusur {
  judul: string;
  /** Rumus simbolik, mis. "total = P + P × r × T" */
  rumus: string;
  /** Baris berisi angka pengguna, berakhir dengan hasil */
  langkah: string[];
  keterangan: string;
}

const a = (x: number) => angka(x);
const desimalR = (persenHarian: number) => angka(persenHarian / 100, 6);

export function telusur(besaran: Besaran, m: Masukan, h: Hasil): Telusur | null {
  const P = m.pokok!;
  const T = m.tenor!;
  const r = m.bungaHarianPersen!;
  const ad = m.adminPersen!;
  const K = m.cicilanLain ?? 0;
  const I = m.penghasilan ?? 0;
  const ket = `P = pokok, r = bunga per hari, T = tenor (hari), a = admin, n = jumlah cicilan. Versi parameter ${h.versiParameter}.`;
  switch (besaran) {
    case "diterima":
      return {
        judul: "Uang yang kamu terima",
        rumus: "diterima = P − P × a",
        langkah: [`= ${a(P)} − ${a(P)} × ${angka(ad / 100, 4)}`, `= ${a(P)} − ${a(h.admin)}`, `= ${rupiah(h.diterima)}`],
        keterangan: `Biaya admin ${persen(ad, 2)} dipotong saat pencairan (asumsi). ${ket}`,
      };
    case "total":
      return {
        judul: "Total yang dibayar",
        rumus: "total = P + P × r × T",
        langkah: [`= ${a(P)} + ${a(P)} × ${desimalR(r)} × ${T}`, `= ${a(P)} + ${a(h.bunga)}`, `= ${rupiah(h.total)}`],
        keterangan: `Bunga flat harian atas pokok (asumsi). Denda keterlambatan tidak dihitung. ${ket}`,
      };
    case "biaya":
      return {
        judul: "Biaya pinjaman",
        rumus: "biaya = total − diterima = bunga + admin",
        langkah: [`= ${a(h.total)} − ${a(h.diterima)}`, `= ${a(h.bunga)} + ${a(h.admin)}`, `= ${rupiah(h.biaya)} (${persen(h.biayaPersenPokok, 1)} dari pokok)`],
        keterangan: ket,
      };
    case "cicilan":
      return {
        judul: "Cicilan per bulan",
        rumus: "n = maks(1, pembulatan atas(T ÷ 30)); cicilan = total ÷ n",
        langkah: [`n = pembulatan atas(${T} ÷ 30) = ${h.jumlahCicilan}`, `cicilan = ${a(h.total)} ÷ ${h.jumlahCicilan}`, `= ${rupiah(h.cicilan)}`],
        keterangan: `Dibagi rata per bulan (asumsi). ${ket}`,
      };
    case "rasio":
      if (!I || h.rasioPersen === null) return null;
      return {
        judul: "Rasio terhadap penghasilan",
        rumus: "rasio = (cicilan + K) ÷ I",
        langkah: [`= (${a(h.cicilan)} + ${a(K)}) ÷ ${a(I)}`, `= ${a(h.cicilan + K)} ÷ ${a(I)}`, `= ${persen(h.rasioPersen, 1)}`],
        keterangan: `K = cicilan lain per bulan, I = penghasilan per bulan. ${teksPatokan(versiAktif())} Versi parameter ${h.versiParameter}.`,
      };
    case "efektif":
      return {
        judul: "Biaya efektif per hari",
        rumus: "efektif = biaya ÷ (P × T)",
        langkah: [`= ${a(h.biaya)} ÷ (${a(P)} × ${T})`, `= ${persen(h.efektifHarianPersen, 3)} per hari`, `Bunga saja: ${persen(h.bungaHarianPersen, 3)} per hari`],
        keterangan: `Belum diketahui apakah batas OJK termasuk admin, jadi dua angka ditampilkan. ${ket}`,
      };
  }
}
