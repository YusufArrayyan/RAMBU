/**
 * State alur Cek (PRD v4 7.4). Disimpan di sessionStorage: bertahan saat dimuat ulang, hilang saat
 * tab ditutup (angka Cek tidak disimpan kecuali dicatat ke Pinjamanku, PRD 14.1).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Klausul } from "@/lib/api";
import { hitung, type Hasil, type Masukan } from "@/lib/engine";
import { cicilanBerikutnya, hariIni, type Pinjaman } from "@/lib/jadwal";
import { normalSegmen, type IdSegmen } from "@/lib/regulasi";
import type { BidangUji } from "@/lib/ujiPaham";

export type SatuanBunga = "hari" | "bulan" | "tahun";

export interface Penawaran {
  id: string;
  nama: string;
  bungaHarianPersen: number | null;
  adminPersen: number | null;
}

export interface Kewajiban {
  id: string;
  nama: string;
  cicilanPerBulan: number;
  sisaBulan: number;
  sumber: "manual" | "ai" | "pinjamanku";
  /** Catatan AI baru dipakai pada hitungan setelah pengguna menekan tombolnya (CIC-03). */
  dipakai?: boolean;
}

export interface Alur {
  segmen: IdSegmen;
  pokok: number | null;
  tenor: number | null;
  /** Bunga sebagaimana tertulis dan satuannya; kode mengonversi ke per hari (CEK-03) */
  bungaTertulis: number | null;
  satuanBunga: SatuanBunga;
  penawaran: Penawaran[];
  terpilih: string;
  penghasilan: number | null;
  kewajiban: Kewajiban[];
  metodeIsi: "manual" | "tempel";
  klausul: Klausul[];
  klausulDibuang: number;
  ujiPaham: Partial<Record<BidangUji, number | null>> | null;
  /** Pakai total cicilan lain pada hitungan (S12) */
  pakaiCicilanLain: boolean;
  /** Kewajiban dari Pinjamanku sudah dimuat sekali untuk sesi ini */
  dariPinjamanku: boolean;
}

export const MAKS_PENAWARAN = 3;
const KUNCI = "rambu-alur-v4";
export const idBaru = () => Math.random().toString(36).slice(2, 9);

/** Konversi bunga tertulis ke persen per hari. Asumsi: 1 bulan = 30 hari, 1 tahun = 365 hari. */
export function keHarian(nilai: number | null, satuan: SatuanBunga): number | null {
  if (nilai == null) return null;
  if (satuan === "bulan") return nilai / 30;
  if (satuan === "tahun") return nilai / 365;
  return nilai;
}

export function alurKosong(): Alur {
  const id = idBaru();
  return {
    segmen: "konsumtif",
    pokok: null,
    tenor: null,
    bungaTertulis: null,
    satuanBunga: "hari",
    penawaran: [{ id, nama: "Penawaranmu", bungaHarianPersen: null, adminPersen: null }],
    terpilih: id,
    penghasilan: null,
    kewajiban: [],
    metodeIsi: "manual",
    klausul: [],
    klausulDibuang: 0,
    ujiPaham: null,
    pakaiCicilanLain: true,
    dariPinjamanku: false,
  };
}

/** Contoh rekaan PRD (Dina): data contoh, bukan penawaran penyelenggara nyata. */
export function alurContoh(): Alur {
  const a = alurKosong();
  return {
    ...a,
    pokok: 3_000_000,
    tenor: 90,
    bungaTertulis: 0.1,
    penawaran: [{ ...a.penawaran[0], nama: "Penawaran B (contoh)", bungaHarianPersen: 0.1, adminPersen: 2 }],
    penghasilan: 4_000_000,
    kewajiban: [{ id: idBaru(), nama: "Paylater Contoh B", cicilanPerBulan: 300_000, sisaBulan: 5, sumber: "manual" }],
    dariPinjamanku: true,
  };
}

function muat(): Alur {
  try {
    const raw = sessionStorage.getItem(KUNCI);
    if (raw) {
      const a = JSON.parse(raw) as Alur;
      if (Array.isArray(a.penawaran) && a.penawaran.length) return { ...alurKosong(), ...a, segmen: normalSegmen(a.segmen) };
    }
  } catch {
    /* abaikan */
  }
  return alurKosong();
}

export interface PenawaranDihitung extends Penawaran {
  masukan: Masukan;
  hasil: Hasil | null;
}

interface AlurCtx {
  alur: Alur;
  ubah: (patch: Partial<Alur>) => void;
  ubahPenawaran: (id: string, patch: Partial<Penawaran>) => void;
  tambahPenawaran: () => void;
  hapusPenawaran: (id: string) => void;
  mulaiUlang: () => void;
  pakaiContoh: () => void;
  isiDariApp: (penghasilan: number | null, pinjaman: Pinjaman[]) => void;
  dihitung: PenawaranDihitung[];
  /** Penawaran terpilih (bawaan: yang diisi di S06) */
  utama: PenawaranDihitung;
  cicilanLain: number;
}

const Ctx = createContext<AlurCtx | null>(null);

export function AlurProvider({ children }: { children: ReactNode }) {
  const [alur, setAlur] = useState<Alur>(muat);

  useEffect(() => {
    try {
      sessionStorage.setItem(KUNCI, JSON.stringify(alur));
    } catch {
      /* abaikan */
    }
  }, [alur]);

  const ubah = useCallback((patch: Partial<Alur>) => setAlur((a) => ({ ...a, ...patch })), []);
  const ubahPenawaran = useCallback((id: string, patch: Partial<Penawaran>) => setAlur((a) => ({ ...a, penawaran: a.penawaran.map((p) => (p.id === id ? { ...p, ...patch } : p)) })), []);
  const tambahPenawaran = useCallback(
    () =>
      setAlur((a) =>
        a.penawaran.length >= MAKS_PENAWARAN
          ? a
          : { ...a, penawaran: [...a.penawaran, { id: idBaru(), nama: `Penawaran ${String.fromCharCode(65 + a.penawaran.length)}`, bungaHarianPersen: null, adminPersen: null }] },
      ),
    [],
  );
  const hapusPenawaran = useCallback(
    (id: string) =>
      setAlur((a) => {
        if (a.penawaran.length <= 1) return a;
        const penawaran = a.penawaran.filter((p) => p.id !== id);
        return { ...a, penawaran, terpilih: a.terpilih === id ? penawaran[0].id : a.terpilih };
      }),
    [],
  );
  const mulaiUlang = useCallback(() => setAlur(alurKosong()), []);
  const pakaiContoh = useCallback(() => setAlur(alurContoh()), []);

  /** Isi penghasilan dari profil dan cicilan lain dari Pinjamanku, sekali per sesi (CEK-01). */
  const isiDariApp = useCallback((penghasilan: number | null, pinjaman: Pinjaman[]) => {
    setAlur((a) => {
      if (a.dariPinjamanku) return a;
      const bulan = hariIni().slice(0, 7);
      const kewajiban: Kewajiban[] = [];
      const per = new Map<string, { nama: string; jumlah: number; sisa: number }>();
      for (const c of cicilanBerikutnya(pinjaman)) {
        const e = per.get(c.pinjaman.id) ?? { nama: c.pinjaman.nama, jumlah: 0, sisa: 0 };
        e.sisa += 1;
        if (c.cicilan.jatuhTempo.startsWith(bulan) || e.jumlah === 0) e.jumlah = Math.max(e.jumlah, c.sisa);
        per.set(c.pinjaman.id, e);
      }
      for (const [id, e] of per) kewajiban.push({ id: `pin-${id}`, nama: e.nama, cicilanPerBulan: Math.round(e.jumlah), sisaBulan: e.sisa, sumber: "pinjamanku" });
      return { ...a, penghasilan: a.penghasilan ?? penghasilan, kewajiban: [...kewajiban, ...a.kewajiban.filter((k) => k.sumber !== "pinjamanku")], dariPinjamanku: true };
    });
  }, []);

  const cicilanLain = useMemo(
    () => (alur.pakaiCicilanLain ? alur.kewajiban.filter((k) => k.dipakai !== false).reduce((s, k) => s + k.cicilanPerBulan, 0) : 0),
    [alur.kewajiban, alur.pakaiCicilanLain],
  );

  const dihitung = useMemo<PenawaranDihitung[]>(
    () =>
      alur.penawaran.map((p) => {
        const masukan: Masukan = {
          pokok: alur.pokok,
          tenor: alur.tenor,
          bungaHarianPersen: p.bungaHarianPersen,
          adminPersen: p.adminPersen,
          penghasilan: alur.penghasilan,
          cicilanLain,
          segmen: alur.segmen,
        };
        return { ...p, masukan, hasil: hitung(masukan) };
      }),
    [alur, cicilanLain],
  );

  const value = useMemo<AlurCtx>(
    () => ({
      alur,
      ubah,
      ubahPenawaran,
      tambahPenawaran,
      hapusPenawaran,
      mulaiUlang,
      pakaiContoh,
      isiDariApp,
      dihitung,
      utama: dihitung.find((p) => p.id === alur.terpilih) ?? dihitung[0],
      cicilanLain,
    }),
    [alur, ubah, ubahPenawaran, tambahPenawaran, hapusPenawaran, mulaiUlang, pakaiContoh, isiDariApp, dihitung, cicilanLain],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlur() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAlur harus dipakai di dalam AlurProvider");
  return c;
}

/** Penawaran dengan biaya terendah (bisa lebih dari satu bila sama). */
export function biayaTerendah(list: PenawaranDihitung[]): Set<string> {
  const valid = list.filter((p) => p.hasil);
  if (valid.length < 2) return new Set();
  const min = Math.min(...valid.map((p) => p.hasil!.biaya));
  return new Set(valid.filter((p) => Math.abs(p.hasil!.biaya - min) < 0.5).map((p) => p.id));
}
