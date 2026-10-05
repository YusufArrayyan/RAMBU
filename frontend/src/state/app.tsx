/**
 * Data Peminjam (PRD v4 3.3, 14.1). Mode tamu: hanya di perangkat (localStorage), tidak pernah
 * dikirim ke server. Mode akun: disimpan di perangkat dan dicadangkan ke server setelah masuk.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { buatJadwal, hariIni, type JenisBayar, type Pinjaman, type RingkasCek } from "@/lib/jadwal";
import { ATURAN_BAWAAN, type AturanPengingat } from "@/lib/pengingat";
import { sinkronkanAkun } from "@/lib/akun";

export type Mode = "tamu" | "akun";

export interface Profil {
  penghasilan: number | null;
  tanggalGajian: number | null;
  zonaWaktu: string;
  tidakTetap: boolean;
}

export interface Akun {
  email: string;
  token: string;
  sejak: string;
}

export interface DataApp {
  versi: 4;
  mode: Mode | null;
  akun: Akun | null;
  profil: Profil;
  pinjaman: Pinjaman[];
  pengingat: AturanPengingat;
  /** Kunci bulan saat kartu lembut ditutup, agar tidak muncul berulang (19.1) */
  kartuLembutDitutup: string | null;
  diubah: string;
}

const KUNCI = "rambu-v4";
/** Data tamu yang disisihkan saat masuk akun tanpa membawanya (ACC-08); kembali saat keluar. */
const KUNCI_TAMU = "rambu-v4-tamu";

export const zonaPerangkat = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
  } catch {
    return "Asia/Jakarta";
  }
};

export function dataKosong(): DataApp {
  return {
    versi: 4,
    mode: null,
    akun: null,
    profil: { penghasilan: null, tanggalGajian: null, zonaWaktu: zonaPerangkat(), tidakTetap: false },
    pinjaman: [],
    pengingat: { ...ATURAN_BAWAAN },
    kartuLembutDitutup: null,
    diubah: new Date().toISOString(),
  };
}

function muat(): DataApp {
  try {
    const raw = localStorage.getItem(KUNCI);
    if (raw) {
      const d = JSON.parse(raw) as DataApp;
      if (d.versi === 4) return { ...dataKosong(), ...d, pengingat: { ...ATURAN_BAWAAN, ...d.pengingat } };
    }
  } catch {
    /* data rusak: mulai baru */
  }
  return dataKosong();
}

// --- Toko sederhana dengan useSyncExternalStore -----------------------------------

let data: DataApp = typeof localStorage === "undefined" ? dataKosong() : muat();
const pendengar = new Set<() => void>();

function simpan(baru: DataApp) {
  data = { ...baru, diubah: new Date().toISOString() };
  try {
    localStorage.setItem(KUNCI, JSON.stringify(data));
  } catch {
    /* penyimpanan penuh atau diblokir */
  }
  pendengar.forEach((f) => f());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KUNCI) {
      data = muat();
      pendengar.forEach((f) => f());
    }
  });
}

const langgan = (f: () => void) => {
  pendengar.add(f);
  return () => pendengar.delete(f);
};

export const idBaru = () => {
  try {
    return crypto.randomUUID().slice(0, 12);
  } catch {
    return Math.random().toString(36).slice(2, 14);
  }
};

export interface TambahPinjaman {
  nama: string;
  penyelenggara?: string;
  cicilanPerKali: number;
  jumlahCicilan: number;
  jatuhTempoPertama: string;
  total?: number;
  asal: "putuskan" | "manual";
  cek?: RingkasCek;
}

function aksi() {
  const ubah = (f: (d: DataApp) => DataApp) => simpan(f(data));
  const ubahPinjaman = (id: string, f: (p: Pinjaman) => Pinjaman) => ubah((d) => ({ ...d, pinjaman: d.pinjaman.map((p) => (p.id === id ? f(p) : p)) }));
  return {
    setMode: (mode: Mode) => ubah((d) => ({ ...d, mode })),
    setAkun: (akun: Akun | null) => ubah((d) => ({ ...d, akun, mode: akun ? "akun" : d.mode === "akun" ? "tamu" : d.mode })),
    setProfil: (p: Partial<Profil>) => ubah((d) => ({ ...d, profil: { ...d.profil, ...p } })),
    setPengingat: (p: Partial<AturanPengingat>) => ubah((d) => ({ ...d, pengingat: { ...d.pengingat, ...p } })),
    tutupKartuLembut: () => ubah((d) => ({ ...d, kartuLembutDitutup: hariIni().slice(0, 7) })),
    tambahPinjaman: (t: TambahPinjaman): string => {
      const id = idBaru();
      const p: Pinjaman = {
        id,
        nama: t.nama.trim() || "Pinjaman tanpa nama",
        penyelenggara: t.penyelenggara?.trim() || undefined,
        cicilan: buatJadwal(t),
        pembayaran: [],
        asal: t.asal,
        cek: t.cek,
        dibuat: hariIni(),
      };
      ubah((d) => ({ ...d, pinjaman: [...d.pinjaman, p] }));
      return id;
    },
    hapusPinjaman: (id: string) => ubah((d) => ({ ...d, pinjaman: d.pinjaman.filter((p) => p.id !== id) })),
    ubahNamaPinjaman: (id: string, nama: string) => ubahPinjaman(id, (p) => ({ ...p, nama })),
    ubahTanggalCicilan: (id: string, cicilanId: string, tanggal: string) =>
      ubahPinjaman(id, (p) => ({ ...p, cicilan: p.cicilan.map((c) => (c.id === cicilanId ? { ...c, jatuhTempo: tanggal } : c)) })),
    catatBayar: (id: string, b: { cicilanId: string; tanggal: string; jumlah: number; jenis: JenisBayar }) =>
      ubahPinjaman(id, (p) => ({ ...p, pembayaran: [...p.pembayaran, { id: idBaru(), ...b }] })),
    batalkanBayar: (id: string, cicilanId: string) => ubahPinjaman(id, (p) => ({ ...p, pembayaran: p.pembayaran.filter((x) => x.cicilanId !== cicilanId) })),
    gantiSemua: (baru: DataApp) => simpan({ ...dataKosong(), ...baru }),
    sisihkanDataTamu: () => {
      try {
        localStorage.setItem(KUNCI_TAMU, JSON.stringify({ ...data, mode: "tamu", akun: null }));
      } catch {
        /* abaikan */
      }
    },
    /** Keluar dari akun: data tamu yang disisihkan dipulihkan; tanpa itu, data akun tetap sebagai tamu. */
    keluarAkun: () => {
      let tamu: DataApp | null = null;
      try {
        tamu = JSON.parse(localStorage.getItem(KUNCI_TAMU) ?? "null");
        localStorage.removeItem(KUNCI_TAMU);
      } catch {
        /* abaikan */
      }
      simpan(tamu ? { ...dataKosong(), ...tamu, mode: "tamu", akun: null } : { ...data, mode: "tamu", akun: null });
      return !!tamu;
    },
    hapusSemua: () => {
      try {
        localStorage.removeItem(KUNCI);
        localStorage.removeItem(KUNCI_TAMU);
        sessionStorage.clear();
      } catch {
        /* abaikan */
      }
      simpan(dataKosong());
    },
  };
}

export type Aksi = ReturnType<typeof aksi>;

const Ctx = createContext<{ data: DataApp; aksi: Aksi } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(langgan, () => data, () => data);
  const a = useMemo(aksi, []);
  // Cadangan mode akun (ACC-07): kirim setelah perubahan, ditunda 1,5 detik. Mode tamu tidak mengirim apa pun.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (snap.mode !== "akun" || !snap.akun) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      sinkronkanAkun(snap).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer.current);
  }, [snap]);
  const nilai = useMemo(() => ({ data: snap, aksi: a }), [snap, a]);
  return <Ctx.Provider value={nilai}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp di luar AppProvider");
  return v;
}

/** Total cicilan per bulan dari Pinjamanku untuk bulan berjalan (dipakai mengisi K di Cek). */
export function useCicilanBulanIni() {
  const { data } = useApp();
  return useCallback(() => {
    const bulan = hariIni().slice(0, 7);
    return data.pinjaman.reduce((s, p) => s + p.cicilan.filter((c) => c.jatuhTempo.startsWith(bulan)).reduce((t, c) => t + c.jumlah, 0), 0);
  }, [data.pinjaman]);
}

// --- Ekspor (ACC-05) -----------------------------------------------------------

export function eksporJson(d: DataApp): string {
  const { akun, ...sisa } = d;
  return JSON.stringify({ ...sisa, akun: akun ? { email: akun.email, sejak: akun.sejak } : null, diekspor: new Date().toISOString() }, null, 2);
}

export function eksporCsv(d: DataApp): string {
  const baris = [["pinjaman", "penyelenggara", "cicilan_ke", "jatuh_tempo", "jumlah", "dibayar", "tanggal_bayar", "jenis_bayar"].join(",")];
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  for (const p of d.pinjaman) {
    for (const c of p.cicilan) {
      const bayar = p.pembayaran.filter((x) => x.cicilanId === c.id);
      const dibayar = bayar.reduce((s, x) => s + x.jumlah, 0);
      baris.push([q(p.nama), q(p.penyelenggara ?? ""), c.ke, c.jatuhTempo, Math.round(c.jumlah), Math.round(dibayar), bayar.map((x) => x.tanggal).join(" "), bayar.map((x) => x.jenis).join(" ")].join(","));
    }
  }
  return baris.join("\n");
}

export function unduhTeks(isi: string, nama: string, tipe: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
