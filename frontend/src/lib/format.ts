/** Format angka gaya Indonesia lewat Intl: Rp3.810.000, 31,8%, 0,36%. */

const nfBulat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const nfCache = new Map<number, Intl.NumberFormat>();

function nf(maxDesimal: number) {
  let f = nfCache.get(maxDesimal);
  if (!f) {
    f = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: maxDesimal });
    nfCache.set(maxDesimal, f);
  }
  return f;
}

/** Pembulatan setengah ke atas yang sama dengan backend (ROUND_HALF_UP). */
function bulat(x: number, desimal = 0): number {
  const k = 10 ** desimal;
  return (Math.sign(x) * Math.round(Math.abs(x) * k + 1e-9)) / k;
}

export function rupiah(x: number): string {
  const n = bulat(x);
  return `${n < 0 ? "-" : ""}Rp${nfBulat.format(Math.abs(n))}`;
}

export function angka(x: number, maxDesimal = 0): string {
  return nf(maxDesimal).format(bulat(x, maxDesimal));
}

export function persen(x: number, maxDesimal = 1): string {
  return `${angka(x, maxDesimal)}%`;
}

// --- Terbilang untuk pembaca layar (PRD 8.4) ----------------------------------

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function terbilangBulat(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh ${terbilangBulat(n % 10)}`.trim();
  if (n < 200) return `seratus ${terbilangBulat(n - 100)}`.trim();
  if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} ratus ${terbilangBulat(n % 100)}`.trim();
  if (n < 2000) return `seribu ${terbilangBulat(n - 1000)}`.trim();
  const tingkat: [number, string][] = [
    [1e12, "triliun"],
    [1e9, "miliar"],
    [1e6, "juta"],
    [1e3, "ribu"],
  ];
  for (const [nilai, nama] of tingkat) {
    if (n >= nilai) return `${terbilangBulat(Math.floor(n / nilai))} ${nama} ${terbilangBulat(n % nilai)}`.trim();
  }
  return "";
}

/** 3270000 → "tiga juta dua ratus tujuh puluh ribu rupiah" */
export function rupiahKata(x: number): string {
  const n = Math.abs(bulat(x));
  const kata = n === 0 ? "nol" : terbilangBulat(n).replace(/\s+/g, " ");
  return `${x < 0 ? "minus " : ""}${kata} rupiah`;
}

/** "34,8 persen" untuk pembaca layar */
export function persenKata(x: number, maxDesimal = 1): string {
  return `${angka(x, maxDesimal)} persen`;
}

/** "Rp3.000.000 · 90 hari" */
export function ringkasPinjaman(pokok: number, tenor: number): string {
  return `${rupiah(pokok)} · ${tenor} hari`;
}

// --- Parsing isian -------------------------------------------------------------

/** Ambil digit saja dan bentuk angka bulat. "3.000.000" -> 3000000. Kosong -> null. */
export function parseRupiah(teks: string): number | null {
  const digit = teks.replace(/\D/g, "");
  if (!digit) return null;
  return Number(digit);
}

/** Tampilkan bilangan bulat dengan titik ribuan, untuk isian. */
export function tampilRupiah(n: number | null): string {
  return n == null ? "" : nfBulat.format(n);
}

/** "0,3" atau "0.3" -> 0.3. Kosong atau tidak valid -> null. */
export function parseDesimal(teks: string): number | null {
  const t = teks.trim().replace(/\s/g, "").replace(",", ".");
  if (!t || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function tampilDesimal(n: number | null): string {
  if (n == null) return "";
  return String(Number(n.toFixed(4))).replace(".", ",");
}

/** Bersihkan ketikan isian desimal: digit dan satu koma, maksimal `maxDesimal` angka di belakang koma. */
export function bersihkanDesimal(teks: string, maxDesimal = 3): string {
  let t = teks.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const i = t.indexOf(",");
  if (i !== -1) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, "").slice(0, maxDesimal);
  if (t.startsWith(",")) t = "0" + t;
  return t;
}
