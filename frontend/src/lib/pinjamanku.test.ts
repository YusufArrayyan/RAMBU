import { describe, expect, it } from "vitest";
import golden from "@shared/golden.json";
import { hitung } from "./engine";
import { buatIcs } from "./ics";
import { buatJadwal, infoCicilan, infoPinjaman, kontrastifBulan, ringkasanBeberapaBulan, tambahBulan, type Pinjaman } from "./jadwal";
import { ATURAN_BAWAAN, alasanPengingat, geserJamTenang, jadwalkanPengingat } from "./pengingat";
import { versiAktif } from "./regulasi";
import { jumlahTepat, nilai } from "./ujiPaham";

const REG = versiAktif(golden.tanggal_acuan);

function pinjaman(nama: string, per: number, n: number, pertama: string, extra: Partial<Pinjaman> = {}): Pinjaman {
  return { id: nama, nama, cicilan: buatJadwal({ cicilanPerKali: per, jumlahCicilan: n, jatuhTempoPertama: pertama }), pembayaran: [], asal: "manual", dibuat: "2026-10-01", ...extra };
}

describe("jadwal (PIN-02, AC-10)", () => {
  it("Rp1.090.000 × 3 mulai 12 Okt 2026", () => {
    const j = buatJadwal({ cicilanPerKali: 1_090_000, jumlahCicilan: 3, jatuhTempoPertama: "2026-10-12" });
    expect(j.map((c) => c.jatuhTempo)).toEqual(["2026-10-12", "2026-11-12", "2026-12-12"]);
    expect(j.every((c) => c.jumlah === 1_090_000)).toBe(true);
    expect(j.map((c) => infoCicilan(c, [], "2026-10-05").status)).toEqual(["terjadwal", "terjadwal", "terjadwal"]);
  });
  it("tanggal 31 dipotong ke akhir bulan", () => {
    expect(tambahBulan("2026-01-31", 1)).toBe("2026-02-28");
    expect(tambahBulan("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("selisih pembulatan ditanggung cicilan terakhir", () => {
    const j = buatJadwal({ cicilanPerKali: 0, jumlahCicilan: 3, jatuhTempoPertama: "2026-10-12", total: 1_000_000 });
    expect(j.map((c) => c.jumlah)).toEqual([333_333, 333_333, 333_334]);
  });
});

describe("tujuh status cicilan (PIN-07)", () => {
  const c = { id: "c1", ke: 1, jatuhTempo: "2026-10-12", jumlah: 1_090_000 };
  it("berdasarkan tanggal", () => {
    expect(infoCicilan(c, [], "2026-10-08").status).toBe("terjadwal");
    expect(infoCicilan(c, [], "2026-10-09").status).toBe("mendekati");
    expect(infoCicilan(c, [], "2026-10-12").status).toBe("jatuh_tempo");
    expect(infoCicilan(c, [], "2026-10-13").status).toBe("terlambat");
  });
  it("berdasarkan catatan bayar", () => {
    const penuh = [{ id: "p", cicilanId: "c1", tanggal: "2026-10-11", jumlah: 1_090_000, jenis: "penuh" as const }];
    expect(infoCicilan(c, penuh, "2026-10-20").status).toBe("dibayar");
    const telat = [{ ...penuh[0], tanggal: "2026-10-14" }];
    expect(infoCicilan(c, telat, "2026-10-20").status).toBe("dibayar_terlambat");
    const nego = [{ id: "n", cicilanId: "c1", tanggal: "2026-10-13", jumlah: 0, jenis: "dinegosiasikan" as const }];
    expect(infoCicilan(c, nego, "2026-10-20").status).toBe("dinegosiasikan");
  });
  it("bayar sebagian: sisa dicatat, jadwal tetap", () => {
    const i = infoCicilan(c, [{ id: "s", cicilanId: "c1", tanggal: "2026-10-10", jumlah: 500_000, jenis: "sebagian" }], "2026-10-10");
    expect(i.sisa).toBe(590_000);
    expect(i.status).toBe("mendekati");
  });
  it("lunas pindah ke Selesai (PIN-09)", () => {
    const p = pinjaman("A", 100_000, 1, "2026-10-12");
    p.pembayaran.push({ id: "x", cicilanId: p.cicilan[0].id, tanggal: "2026-10-12", jumlah: 100_000, jenis: "penuh" });
    expect(infoPinjaman(p, "2026-10-13").selesai).toBe(true);
  });
});

describe("ringkasan bulanan dan kontrastif antar bulan (S21, XAI-06)", () => {
  const A = pinjaman("Pinjaman Contoh A", 1_090_000, 3, "2026-10-12");
  const B = pinjaman("Paylater Contoh B", 300_000, 5, "2026-10-20");
  const bulan = ringkasanBeberapaBulan([A, B], "2026-10-01", 6, 4_000_000, "2026-10-05");
  it("Okt–Des 34,75%, Jan–Feb 7,5%, Mar 0%", () => {
    expect(bulan.map((b) => Number(b.rasioPersen!.toFixed(2)))).toEqual([34.75, 34.75, 34.75, 7.5, 7.5, 0]);
  });
  it("Januari turun karena Pinjaman Contoh A selesai Desember", () => {
    const k = kontrastifBulan(bulan[2], bulan[3], 4_000_000);
    expect(k.selesai.map((p) => p.nama)).toEqual(["Pinjaman Contoh A"]);
    expect(k.selisihPoin).toBeCloseTo(-27.25, 6);
  });
});

describe("mesin pengingat (ING-01 s.d. ING-04)", () => {
  const A = () => pinjaman("A", 1_090_000, 3, "2026-10-12");
  it("H-3, H-1, H, H+1, H+3 untuk cicilan yang belum ditandai", () => {
    const n = jadwalkanPengingat([A()], ATURAN_BAWAAN, "2026-10-01", "2026-10-31", { hari: "2026-10-01" });
    expect(n.map((x) => x.pemicu)).toEqual(["H-3", "H-1", "Hari H", "H+1", "H+3"]);
    expect(n.find((x) => x.pemicu === "H+1")!.tawarkanBantuan).toBe(true);
    expect(n.filter((x) => x.tawarkanBantuan)).toHaveLength(1);
  });
  it("berhenti setelah ditandai dibayar (AC-11)", () => {
    const p = A();
    p.pembayaran.push({ id: "b", cicilanId: p.cicilan[0].id, tanggal: "2026-10-09", jumlah: 1_090_000, jenis: "penuh" });
    const n = jadwalkanPengingat([p], ATURAN_BAWAAN, "2026-10-10", "2026-10-31", { hari: "2026-10-10" });
    expect(n.filter((x) => x.jatuhTempo === "2026-10-12")).toHaveLength(0);
  });
  it("jam tenang menunda 22:00 ke 07:00 esok (AC-12)", () => {
    const a = { ...ATURAN_BAWAAN, jamKirim: "22:00" };
    expect(geserJamTenang("2026-10-09", "22:00", a)).toEqual({ tanggal: "2026-10-10", jam: "07:00", ditunda: true });
    const n = jadwalkanPengingat([A()], a, "2026-10-09", "2026-10-09", { hari: "2026-10-09" });
    expect(n[0].waktu).toBe("2026-10-10T07:00");
    expect(alasanPengingat(n[0], a)).toContain("ditunda");
  });
  it("maksimal 5 per hari", () => {
    const banyak = Array.from({ length: 8 }, (_, i) => pinjaman(`P${i}`, 100_000, 1, `2026-10-${String(10 + (i % 4) * 2).padStart(2, "0")}`));
    const n = jadwalkanPengingat(banyak, ATURAN_BAWAAN, "2026-10-01", "2026-10-31", { hari: "2026-10-01" });
    const perHari = new Map<string, number>();
    n.forEach((x) => perHari.set(x.waktu.slice(0, 10), (perHari.get(x.waktu.slice(0, 10)) ?? 0) + 1));
    expect(Math.max(...perHari.values())).toBeLessThanOrEqual(5);
  });
  it("cicilan di hari yang sama digabung", () => {
    const n = jadwalkanPengingat([A(), pinjaman("B", 300_000, 1, "2026-10-12")], ATURAN_BAWAAN, "2026-10-09", "2026-10-09", { hari: "2026-10-09" });
    expect(n).toHaveLength(1);
    expect(n[0].cicilanIds).toHaveLength(2);
    expect(n[0].isi).toContain("2 cicilan");
  });
  it("mode privasi tanpa jumlah rupiah (AC-13)", () => {
    const n = jadwalkanPengingat([A()], ATURAN_BAWAAN, "2026-10-01", "2026-10-31", { hari: "2026-10-01" });
    n.forEach((x) => expect(x.isi).not.toMatch(/Rp/));
    const terbuka = jadwalkanPengingat([A()], { ...ATURAN_BAWAAN, privasi: false }, "2026-10-09", "2026-10-09", { hari: "2026-10-09" });
    expect(terbuka[0].isi).toContain("Rp1.090.000");
  });
  it("salin netral tanpa kata menghakimi (AC-16)", () => {
    const semua = jadwalkanPengingat([A()], { ...ATURAN_BAWAAN, privasi: false, gajian: true }, "2026-09-01", "2027-01-31", { hari: "2026-09-01", tanggalGajian: 25 });
    semua.forEach((x) => expect(x.isi).not.toMatch(/macet|galbay|menunggak/i));
  });
});

describe("ekspor .ics (JDW-03)", () => {
  it("satu acara per cicilan belum dibayar, privasi tanpa jumlah", () => {
    const ics = buatIcs([pinjaman("A", 1_090_000, 3, "2026-10-12")], { privasi: true });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261012");
    expect(ics).not.toContain("Rp");
  });
});

describe("uji paham, toleransi 2% (UJP-02, AC-08)", () => {
  const B = golden.kasus[1].masukan;
  const hB = hitung({ pokok: B.pokok, tenor: B.tenor, bungaHarianPersen: B.bunga_harian_persen, adminPersen: B.admin_persen, penghasilan: B.penghasilan, cicilanLain: B.cicilan_lain }, REG)!;
  it("'sekitar 2,9 juta' untuk Rp2.940.000 dekat dengan mesin", () => {
    expect(nilai({ diterima: 2_900_000 }, hB)[0].tepat).toBe(true);
  });
  it("batas toleransi tepat 2%", () => {
    expect(nilai({ total: hB.total * 1.02 }, hB)[1].tepat).toBe(true);
    expect(nilai({ total: hB.total * 1.021 }, hB)[1].tepat).toBe(false);
  });
  it("kolom kosong dihitung belum tepat", () => {
    const n = nilai({ diterima: 2_940_000 }, hB);
    expect(jumlahTepat(n)).toBe(1);
    expect(n[2].jawaban).toBeNull();
  });
});
