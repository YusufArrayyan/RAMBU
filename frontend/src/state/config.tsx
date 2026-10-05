/**
 * Konfigurasi server: apakah fitur AI dan akun tersedia. Regulasi selalu tersedia dari berkas
 * yang dibundel, jadi Cek tetap bekerja penuh tanpa server (DOK-06, NFR-03).
 */
import { Fragment, createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ambilKonfig, ambilRegulasi } from "@/lib/api";
import { pasangVersiServer, versiAktif } from "@/lib/regulasi";

interface Konfig {
  aiTersedia: boolean;
  akunTersedia: boolean;
  pushTersedia: boolean;
  serverTerhubung: boolean;
  dimuat: boolean;
}

const awal: Konfig = { aiTersedia: false, akunTersedia: false, pushTersedia: false, serverTerhubung: false, dimuat: false };
const Ctx = createContext<Konfig>(awal);

export function KonfigProvider({ children }: { children: ReactNode }) {
  const [k, setK] = useState<Konfig>(awal);
  const [versi, setVersi] = useState(() => versiAktif().id);
  useEffect(() => {
    let batal = false;
    // Versi parameter terbit terbaru dari server; tanpa server, berkas yang dibundel tetap dipakai.
    ambilRegulasi()
      .then((r) => {
        if (!batal && pasangVersiServer(r.versi)) setVersi(versiAktif().id);
      })
      .catch(() => {});
    ambilKonfig()
      .then((c) => !batal && setK({ aiTersedia: c.ai_tersedia, akunTersedia: c.akun_tersedia ?? false, pushTersedia: c.push_tersedia ?? false, serverTerhubung: true, dimuat: true }))
      .catch(() => !batal && setK({ ...awal, dimuat: true }));
    return () => {
      batal = true;
    };
  }, []);
  return (
    <Ctx.Provider value={k}>
      {/* Bila versi parameter berubah, seluruh hitungan dirender ulang dengan versi baru. */}
      <Fragment key={versi}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export const useKonfig = () => useContext(Ctx);
