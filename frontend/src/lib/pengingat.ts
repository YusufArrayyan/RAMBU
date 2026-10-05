/**
 * Mesin pengingat (PRD v4 7.7, ING-01 s.d. ING-09). Fungsi murni: dipakai klien untuk banner
 * mode tamu dan pratinjau, dan dicerminkan oleh penjadwal server untuk mode akun.
 */
import { rupiah } from "./format";
import { HARI, cicilanBerikutnya, dariIso, infoPinjaman, keIso, selisihHari, sudahDibayar, tambahHari, tglPendek, type Pinjaman } from "./jadwal";

export type Offset = -3 | -1 | 0 | 1 | 3;
export const SEMUA_OFFSET: Offset[] = [-3, -1, 0, 1, 3];
export const LABEL_OFFSET: Record<Offset, string> = { [-3]: "H-3", [-1]: "H-1", 0: "Hari H", 1: "H+1", 3: "H+3" } as Record<Offset, string>;

export interface AturanPengingat {
  offsets: Offset[];
  /** "HH:MM" jam kirim */
  jamKirim: string;
  jamTenangMulai: string;
  jamTenangSelesai: string;
  maksPerHari: number;
  /** Mode privasi: tanpa jumlah di layar kunci (ING-04). Bawaan hidup. */
  privasi: boolean;
  gajian: boolean;
  push: boolean;
  email: boolean;
}

export const ATURAN_BAWAAN: AturanPengingat = {
  offsets: [-3, -1, 0, 1, 3],
  jamKirim: "09:00",
  jamTenangMulai: "21:00",
  jamTenangSelesai: "07:00",
  maksPerHari: 5,
  privasi: true,
  gajian: false,
  push: false,
  email: false,
};

export type Pemicu = "H-3" | "H-1" | "Hari H" | "H+1" | "H+3" | "Gajian";

export interface Notifikasi {
  id: string;
  /** Waktu kirim lokal "YYYY-MM-DDTHH:MM" */
  waktu: string;
  pemicu: Pemicu;
  judul: string;
  isi: string;
  /** Satu-satunya pemicu yang menyertakan tautan bantuan (ING-09) */
  tawarkanBantuan: boolean;
  cicilanIds: string[];
  jatuhTempo?: string;
  ditunda: boolean;
}

const menit = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const keJam = (mnt: number) => `${String(Math.floor(mnt / 60)).padStart(2, "0")}:${String(mnt % 60).padStart(2, "0")}`;

/** Apakah menit-dalam-hari berada di jam tenang (rentang boleh melewati tengah malam). */
export function diJamTenang(mnt: number, a: AturanPengingat): boolean {
  const s = menit(a.jamTenangMulai);
  const e = menit(a.jamTenangSelesai);
  if (s === e) return false;
  return s < e ? mnt >= s && mnt < e : mnt >= s || mnt < e;
}

/**
 * Geser waktu yang jatuh di jam tenang ke akhir jam tenang (AC-12: 22:00 → 07:00 esok).
 */
export function geserJamTenang(tanggal: string, jam: string, a: AturanPengingat): { tanggal: string; jam: string; ditunda: boolean } {
  const m = menit(jam);
  if (!diJamTenang(m, a)) return { tanggal, jam, ditunda: false };
  const selesai = menit(a.jamTenangSelesai);
  const besok = m >= selesai; // sudah lewat tengah hari jam tenang: tunda ke esok
  return { tanggal: besok ? tambahHari(tanggal, 1) : tanggal, jam: keJam(selesai), ditunda: true };
}

const LABEL: Record<Offset, Pemicu> = { [-3]: "H-3", [-1]: "H-1", 0: "Hari H", 1: "H+1", 3: "H+3" } as Record<Offset, Pemicu>;

/** Salin netral sesuai 7.7. Jumlah hanya bila privasi dimatikan. */
export function teksPengingat(pemicu: Pemicu, jatuhTempo: string, jumlahCicilan: number, total: number, privasi: boolean): { judul: string; isi: string } {
  const tgl = tglPendek(jatuhTempo);
  const banyak = jumlahCicilan > 1 ? `${jumlahCicilan} cicilan` : "Cicilan";
  const nominal = privasi ? "" : ` (${rupiah(total)})`;
  switch (pemicu) {
    case "H-3":
      return { judul: "RAMBU", isi: `Ada ${banyak.toLowerCase()} jatuh tempo 3 hari lagi (${tgl})${nominal}. Buka untuk lihat.` };
    case "H-1":
      return { judul: "RAMBU", isi: `${banyak} jatuh tempo besok${nominal}.` };
    case "Hari H":
      return { judul: "RAMBU", isi: `${banyak} jatuh tempo hari ini${nominal}.` };
    case "H+1":
      return { judul: "RAMBU", isi: `${banyak} belum ditandai. Sudah dibayar? Tandai di RAMBU. Kalau terasa berat, ada pilihan bantuan.` };
    case "H+3":
      return { judul: "RAMBU", isi: `${banyak} ${tgl} masih belum ditandai. Buka RAMBU untuk melihat pilihan.` };
    case "Gajian":
      return { judul: "RAMBU", isi: privasi ? "Hari ini gajian. Buka RAMBU untuk melihat total cicilan bulan ini." : `Hari ini gajian. Total cicilan bulan ini ${rupiah(total)}.` };
  }
}

/**
 * Jadwalkan pengingat dalam rentang [dari, sampai] (inklusif, YYYY-MM-DD).
 * - berhenti seketika untuk cicilan yang sudah ditandai dibayar (ING-02);
 * - setelah H+3 tidak ada pengingat lagi;
 * - beberapa cicilan di hari yang sama digabung;
 * - jam tenang menunda, maksimal `maksPerHari` per hari (ING-03).
 */
export function jadwalkanPengingat(daftar: Pinjaman[], a: AturanPengingat, dari: string, sampai: string, opsi: { tanggalGajian?: number | null; hari?: string } = {}): Notifikasi[] {
  const hari = opsi.hari ?? dari;
  // kelompokkan per (tanggal kirim, pemicu, jatuh tempo)
  const grup = new Map<string, { tanggal: string; pemicu: Pemicu; jatuhTempo: string; ids: string[]; total: number }>();
  for (const p of daftar) {
    for (const c of infoPinjaman(p, hari).cicilan) {
      if (sudahDibayar(c.status)) continue;
      for (const off of a.offsets) {
        const tanggal = tambahHari(c.cicilan.jatuhTempo, off);
        if (tanggal < dari || tanggal > sampai) continue;
        const pemicu = LABEL[off];
        const k = `${tanggal}|${pemicu}|${c.cicilan.jatuhTempo}`;
        const g = grup.get(k) ?? { tanggal, pemicu, jatuhTempo: c.cicilan.jatuhTempo, ids: [], total: 0 };
        g.ids.push(c.cicilan.id);
        g.total += c.sisa;
        grup.set(k, g);
      }
    }
  }
  const hasil: Notifikasi[] = [];
  for (const g of grup.values()) {
    const geser = geserJamTenang(g.tanggal, a.jamKirim, a);
    const t = teksPengingat(g.pemicu, g.jatuhTempo, g.ids.length, g.total, a.privasi);
    hasil.push({
      id: `${g.tanggal}-${g.pemicu}-${g.jatuhTempo}`,
      waktu: `${geser.tanggal}T${geser.jam}`,
      pemicu: g.pemicu,
      ...t,
      tawarkanBantuan: g.pemicu === "H+1",
      cicilanIds: g.ids,
      jatuhTempo: g.jatuhTempo,
      ditunda: geser.ditunda,
    });
  }
  if (a.gajian && opsi.tanggalGajian) {
    for (let d = dari; d <= sampai; d = tambahHari(d, 1)) {
      if (dariIso(d).getDate() !== opsi.tanggalGajian) continue;
      const bulan = d.slice(0, 7);
      const total = cicilanBerikutnya(daftar, hari)
        .filter((c) => c.cicilan.jatuhTempo.startsWith(bulan))
        .reduce((s, c) => s + c.sisa, 0);
      if (total <= 0) continue;
      const geser = geserJamTenang(d, a.jamKirim, a);
      hasil.push({ id: `${d}-gajian`, waktu: `${geser.tanggal}T${geser.jam}`, pemicu: "Gajian", ...teksPengingat("Gajian", d, 1, total, a.privasi), tawarkanBantuan: false, cicilanIds: [], ditunda: geser.ditunda });
    }
  }
  hasil.sort((x, y) => x.waktu.localeCompare(y.waktu));
  // batas harian: urutkan per hari, sisakan yang paling mendesak (lewat tempo dulu, lalu yang terdekat)
  const prioritas: Record<Pemicu, number> = { "H+3": 0, "H+1": 1, "Hari H": 2, "H-1": 3, "H-3": 4, Gajian: 5 };
  const perHari = new Map<string, Notifikasi[]>();
  for (const n of hasil) {
    const d = n.waktu.slice(0, 10);
    perHari.set(d, [...(perHari.get(d) ?? []), n]);
  }
  const lolos = new Set<string>();
  for (const daftarHari of perHari.values()) {
    [...daftarHari].sort((x, y) => prioritas[x.pemicu] - prioritas[y.pemicu]).slice(0, Math.max(0, a.maksPerHari)).forEach((n) => lolos.add(n.id));
  }
  return hasil.filter((n) => lolos.has(n.id));
}

/** "Kenapa pengingat ini muncul?" (XAI-07, 6.8) */
export function alasanPengingat(n: Notifikasi, a: AturanPengingat): string {
  const tenang = `Jam tenang ${a.jamTenangMulai}–${a.jamTenangSelesai}; maksimal ${a.maksPerHari} pengingat per hari.`;
  if (n.pemicu === "Gajian") return `Pengingat gajian: kamu menyalakan pengingat tanggal gajian pada Atur pengingat. ${tenang}`;
  const tunda = n.ditunda ? " Jam kirimmu jatuh di jam tenang, jadi pengingat ditunda sampai jam tenang selesai." : "";
  return `Pengingat ${n.pemicu}: cicilan jatuh tempo ${tglPendek(n.jatuhTempo!)}. Kamu mengaktifkan ${n.pemicu} pada Atur pengingat. Pengingat berhenti setelah cicilan ditandai dibayar.${tunda} ${tenang}`;
}

/** Banner dalam aplikasi untuk mode tamu (ING-06): pengingat hari ini yang masih relevan. */
export function bannerHariIni(daftar: Pinjaman[], a: AturanPengingat, hari: string = keIso(new Date())): Notifikasi[] {
  return jadwalkanPengingat(daftar, { ...a, jamTenangMulai: "00:00", jamTenangSelesai: "00:00" }, hari, hari, { hari });
}

export const namaHari = (iso: string) => HARI[dariIso(iso).getDay()];
export const hariMenuju = (dari: string, ke: string) => selisihHari(dari, ke);
