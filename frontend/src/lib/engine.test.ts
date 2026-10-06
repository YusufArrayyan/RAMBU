import { describe, expect, it } from "vitest";
import golden from "@shared/golden.json";
import { hitung, kontrafaktual, kontrastifPenawaran, kontrastifRasio, ujiTekanan, type Masukan } from "./engine";
import { penjelasanTemplat } from "./explain";
import { bersihkanDesimal, parseDesimal, parseRupiah, persen, rupiah, rupiahKata, tampilRupiah } from "./format";
import { semuaVersi, versiAktif, type IdSegmen } from "./regulasi";
import { telusur } from "./telusur";

const REG = versiAktif(golden.tanggal_acuan);

interface MasukanJson {
  pokok: number;
  tenor: number;
  bunga_harian_persen: number;
  admin_persen: number;
  penghasilan: number | null;
  cicilan_lain: number;
  segmen?: string;
}

const keMasukan = (d: MasukanJson): Masukan => ({
  pokok: d.pokok,
  tenor: d.tenor,
  bungaHarianPersen: d.bunga_harian_persen,
  adminPersen: d.admin_persen,
  penghasilan: d.penghasilan,
  cicilanLain: d.cicilan_lain,
  segmen: (d.segmen as IdSegmen) ?? "konsumtif",
});

const kasus = (nama: string) => keMasukan(golden.kasus.find((k) => k.nama === nama)!.masukan);

function nilaiDari(h: NonNullable<ReturnType<typeof hitung>>, k: string): unknown {
  const peta: Record<string, unknown> = {
    bunga: h.bunga,
    admin: h.admin,
    diterima: h.diterima,
    total: h.total,
    biaya: h.biaya,
    jumlah_cicilan: h.jumlahCicilan,
    cicilan: h.cicilan,
    rasio_sendiri_persen: h.rasioSendiriPersen,
    rasio_persen: h.rasioPersen,
    efektif_harian_persen: h.efektifHarianPersen,
    di_atas_patokan: h.diAtasPatokan,
    status_batas: h.statusBatas,
    batas_tipe: h.batas.tipe,
    batas_persen: h.batas.tipe === "tunggal" ? h.batas.persen : null,
    di_atas_batas_total: h.diAtasBatasTotal,
  };
  if (!(k in peta)) throw new Error(`kunci golden tidak dikenal: ${k}`);
  return peta[k];
}

function cocok(h: NonNullable<ReturnType<typeof hitung>>, harapan: Record<string, unknown>) {
  for (const [k, v] of Object.entries(harapan)) {
    const aktual = nilaiDari(h, k);
    if (typeof v === "number" && typeof aktual === "number") expect(aktual, k).toBeCloseTo(v, 3);
    else expect(aktual, k).toBe(v);
  }
}

describe("uji acuan PRD v4 (golden A/B/C)", () => {
  for (const k of golden.kasus) {
    it(`penawaran ${k.nama}`, () => {
      const h = hitung(keMasukan(k.masukan), REG)!;
      expect(h).not.toBeNull();
      cocok(h, k.harapan);
      expect(rupiah(h.diterima)).toBe(k.tampilan.diterima);
      expect(rupiah(h.total)).toBe(k.tampilan.total);
      expect(rupiah(h.biaya)).toBe(k.tampilan.biaya);
      expect(rupiah(h.cicilan)).toBe(k.tampilan.cicilan);
      expect(persen(h.rasioSendiriPersen!, 1)).toBe(k.tampilan.rasio_sendiri);
      expect(persen(h.rasioPersen!, 1)).toBe(k.tampilan.rasio);
      expect(persen(h.efektifHarianPersen, 3)).toBe(k.tampilan.efektif);
      expect(h.versiParameter).toBe(golden.versi_acuan);
    });
  }

  it("bunga tepat tanpa galat biner", () => {
    expect(hitung(kasus("A"), REG)!.bunga).toBe(810000);
  });
});

describe("kasus tepi", () => {
  for (const k of golden.tepi) {
    it(k.nama, () => {
      const versi = (k as { versi?: string }).versi;
      const h = hitung(keMasukan(k.masukan as MasukanJson), versi ? semuaVersi.find((v) => v.id === versi)! : REG);
      if (k.harapan === null) expect(h).toBeNull();
      else cocok(h!, k.harapan as Record<string, unknown>);
    });
  }
});

describe("uji tekanan (CEK-13)", () => {
  it("penawaran B dengan cicilan lain", () => {
    const g = golden.uji_tekanan;
    const b = ujiTekanan(g.penghasilan, g.total_cicilan, REG);
    expect(b.map((x) => x.penurunanPersen)).toEqual([0, 10, 20, 30, 40]);
    b.forEach((x, i) => expect(x.rasioPersen).toBeCloseTo(g.rasio_persen[i], 2));
    expect(b.every((x) => x.diAtasPatokan)).toBe(true);
  });
  it("patokan 30% terlewati hanya pada penurunan 40%", () => {
    expect(ujiTekanan(10_000_000, 2_000_000, REG).map((x) => x.diAtasPatokan)).toEqual([false, false, false, false, true]);
  });
  it("penghasilan kosong: tidak dihitung", () => {
    expect(ujiTekanan(null, 1_000_000, REG)).toEqual([]);
  });
});

describe("kontrastif (XAI-02, XAI-03)", () => {
  it("rasio: 27,25% + 7,5 poin = 34,75%", () => {
    const m = kasus("B");
    const k = kontrastifRasio(hitung(m, REG)!, m.penghasilan, m.cicilanLain)!;
    expect(k.selisihPoin).toBeCloseTo(golden.kontrastif_rasio.selisih_poin, 6);
    expect(k.rasioSendiriPersen + k.selisihPoin).toBeCloseTo(k.rasioPersen, 9);
  });
  it("penawaran: selisih biaya = selisih bunga + selisih admin", () => {
    const g = golden.kontrastif_penawaran;
    const k = kontrastifPenawaran(hitung(kasus(g.murah), REG)!, hitung(kasus(g.mahal), REG)!);
    expect(k.selisihBiaya).toBeCloseTo(g.selisih_biaya, 6);
    expect(k.selisihBunga).toBeCloseTo(g.selisih_bunga, 6);
    expect(k.selisihAdmin).toBeCloseTo(g.selisih_admin, 6);
  });
});

describe("kontrafaktual (XAI-04, AC-04)", () => {
  it("nilai untuk Dina", () => {
    const g = golden.kontrafaktual;
    const m = kasus(g.kasus);
    const k = kontrafaktual(m, hitung(m, REG)!);
    expect(k.jenis).toBe("ubah");
    if (k.jenis !== "ubah") return;
    expect(k.pokokMaksMentah).toBeCloseTo(g.pokok_maks_mentah, 1);
    expect(k.pokokMaks).toBe(g.pokok_maks);
    expect(k.cicilanLainMaks).toBe(g.cicilan_lain_maks);
    expect(k.penghasilanMinMentah).toBeCloseTo(g.penghasilan_min_mentah, 1);
    expect(k.penghasilanMin).toBe(g.penghasilan_min);
    const r = hitung({ ...m, pokok: k.pokokMaks }, REG)!;
    expect(r.rasioPersen!).toBeCloseTo(g.rasio_dengan_pokok_maks, 3);
    expect(r.diAtasPatokan).toBe(false);
  });

  it("sudah dalam patokan: tampilkan ruang tersisa", () => {
    const m = { ...kasus("B"), cicilanLain: 0, penghasilan: 5_000_000 };
    const k = kontrafaktual(m, hitung(m, REG)!);
    expect(k.jenis).toBe("ruang");
  });

  it("cicilan lain saja sudah melewati patokan", () => {
    const m = { ...kasus("B"), cicilanLain: 1_300_000 };
    expect(kontrafaktual(m, hitung(m, REG)!).jenis).toBe("tidak_ada");
  });

  it("penghasilan kosong", () => {
    const m = { ...kasus("B"), penghasilan: null };
    expect(kontrafaktual(m, hitung(m, REG)!).jenis).toBe("tanpa_penghasilan");
  });

  // Uji properti (XAI-10, AC-05): generator acak deterministik, 5.000 masukan valid.
  it("properti: nilai kontrafaktual yang dimasukkan kembali memenuhi patokan", () => {
    let seed = 20261005;
    const acak = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pilih = <T,>(xs: T[]) => xs[Math.floor(acak() * xs.length)];
    let diuji = 0;
    for (let i = 0; i < 5000; i++) {
      const m: Masukan = {
        pokok: Math.round(500_000 + acak() * 19_500_000),
        tenor: pilih([7, 14, 15, 30, 45, 60, 90, 120, 180, 200, 270, 360]),
        bungaHarianPersen: Number((acak() * 0.4).toFixed(3)),
        adminPersen: Number((acak() * 10).toFixed(2)),
        penghasilan: Math.round(1_500_000 + acak() * 13_500_000),
        cicilanLain: pilih([0, 0, 150_000, 300_000, 750_000, 1_500_000]),
      };
      const h = hitung(m, REG)!;
      const k = kontrafaktual(m, h);
      if (k.jenis !== "ubah") continue;
      diuji++;
      const L = h.patokanPersen + 1e-9;
      expect(hitung({ ...m, pokok: k.pokokMaks }, REG)!.rasioPersen!).toBeLessThanOrEqual(L);
      expect(hitung({ ...m, penghasilan: k.penghasilanMin }, REG)!.rasioPersen!).toBeLessThanOrEqual(L);
      if (k.cicilanLainMaks !== null) expect(hitung({ ...m, cicilanLain: k.cicilanLainMaks }, REG)!.rasioPersen!).toBeLessThanOrEqual(L);
      // satu langkah (Rp1.000) di atas P_max harus melewati patokan
      expect(hitung({ ...m, pokok: k.pokokMaks + 1000 }, REG)!.rasioPersen!).toBeGreaterThan(h.patokanPersen);
    }
    expect(diuji).toBeGreaterThan(500);
  });
});

describe("telusur (XAI-01)", () => {
  it("rumus total memakai angka yang sama", () => {
    const m = kasus("B");
    const t = telusur("total", m, hitung(m, REG)!)!;
    expect(t.rumus).toBe("total = P + P × r × T");
    expect(t.langkah.join(" ")).toContain("3.000.000 + 3.000.000 × 0,001 × 90");
    expect(t.langkah.at(-1)).toBe("= Rp3.270.000");
  });
  it("rasio tidak tersedia tanpa penghasilan", () => {
    const m = { ...kasus("B"), penghasilan: null };
    expect(telusur("rasio", m, hitung(m, REG)!)).toBeNull();
  });
});

describe("format", () => {
  it("rupiah dan persen", () => {
    expect(rupiah(3810000)).toBe("Rp3.810.000");
    expect(rupiah(1269999.6)).toBe("Rp1.270.000");
    expect(persen(31.75, 1)).toBe("31,8%");
    expect(persen(0.3, 2)).toBe("0,3%");
    expect(persen(30, 0)).toBe("30%");
  });
  it("rupiah dalam kata untuk pembaca layar", () => {
    expect(rupiahKata(3_270_000)).toBe("tiga juta dua ratus tujuh puluh ribu rupiah");
    expect(rupiahKata(1_000)).toBe("seribu rupiah");
    expect(rupiahKata(2_940_000)).toBe("dua juta sembilan ratus empat puluh ribu rupiah");
    expect(rupiahKata(115_000)).toBe("seratus lima belas ribu rupiah");
  });
  it("parsing isian", () => {
    expect(parseRupiah("Rp 3.000.000")).toBe(3000000);
    expect(parseRupiah("")).toBeNull();
    expect(tampilRupiah(4000000)).toBe("4.000.000");
    expect(parseDesimal("0,3")).toBe(0.3);
    expect(parseDesimal("0.3")).toBe(0.3);
    expect(parseDesimal("")).toBeNull();
    expect(bersihkanDesimal("0.35,1")).toBe("0,351");
    expect(bersihkanDesimal(",5")).toBe("0,5");
    expect(bersihkanDesimal("1,23456", 3)).toBe("1,234");
  });
});

describe("penjelasan templat", () => {
  it("memakai angka mesin dan kata patokan", () => {
    const m = kasus("A");
    const teks = penjelasanTemplat(m, hitung(m, REG)!);
    expect(teks).toContain("Rp2.850.000");
    expect(teks).toContain("Rp3.810.000");
    expect(teks).toContain("39,3%");
    expect(teks).toContain("patokan 30%");
    expect(teks).toContain("Biaya efektif, termasuk admin, di atas batas 0,3% per hari");
    expect(teks).not.toMatch(/melanggar/);
  });
});
