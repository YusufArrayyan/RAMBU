/**
 * Penjelasan templat, disusun hanya dari keluaran mesin hitung.
 * Sama dengan backend/app/explain.py:penjelasan_templat; dipakai langsung di perangkat
 * dan sebagai cadangan bila penjelasan AI ditolak pemeriksa atau tidak tersedia.
 */
import type { Hasil, Masukan } from "./engine";
import { persen, rupiah } from "./format";

export function kalimatBatas(h: Hasil): string {
  const b = h.batas;
  const teksBatas = b.tipe === "tunggal" ? persen(b.persen, 3) : `${persen(b.min, 1)} sampai ${persen(b.maks, 1)}`;
  switch (h.statusBatas) {
    case "bawah_batas":
      return `Biaya efektif, termasuk admin, di bawah batas ${teksBatas} per hari (perkiraan).`;
    case "atas_batas":
      return `Biaya efektif, termasuk admin, di atas batas ${teksBatas} per hari (perkiraan).`;
    case "bawah_keduanya":
      return `Di bawah batas ${teksBatas} per hari, dengan dan tanpa admin (perkiraan).`;
    case "atas_jika_admin":
      return `Bunga saja di bawah batas ${teksBatas} per hari, tetapi di atas batas jika admin dihitung (perkiraan).`;
    case "atas_bunga":
      return `Di atas batas ${teksBatas} per hari, bahkan tanpa admin (perkiraan).`;
    case "belum_pasti":
      return `Batas untuk tenor lebih dari enam bulan antara ${teksBatas} per hari dan belum jelas; angka ini berada di rentang itu.`;
  }
}

export function penjelasanTemplat(m: Masukan, h: Hasil): string {
  const k: string[] = [
    `Dari pinjaman ${rupiah(m.pokok!)}, dana yang kamu terima ${rupiah(h.diterima)} karena biaya admin ${rupiah(h.admin)} dipotong di muka.`,
    `Selama ${m.tenor} hari, bunganya ${rupiah(h.bunga)}, jadi total yang harus kamu kembalikan ${rupiah(h.total)}. Selisih ${rupiah(h.biaya)} itulah biaya pinjamanmu.`,
  ];
  k.push(
    h.jumlahCicilan === 1
      ? `Pinjaman ini dibayar sekali, sebesar ${rupiah(h.cicilan)}.`
      : `Kalau dibagi rata ${h.jumlahCicilan} kali, cicilannya sekitar ${rupiah(h.cicilan)} per bulan.`,
  );
  if (h.rasioPersen === null) {
    k.push("Rasio cicilan terhadap penghasilan tidak dapat dihitung karena penghasilan belum diisi.");
  } else {
    const posisi = h.diAtasPatokan ? "di atas" : "dalam";
    k.push(`Bersama cicilan lain, cicilan itu ${persen(h.rasioPersen, 1)} dari penghasilanmu, ${posisi} patokan ${persen(h.patokanPersen, 0)}.`);
  }
  k.push(`Biaya efektifnya sekitar ${persen(h.efektifHarianPersen, 2)} per hari. ${kalimatBatas(h)}`);
  return k.join(" ");
}
