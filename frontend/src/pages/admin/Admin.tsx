/**
 * Panel Admin RAMBU dan Mitra (desktop, PRD v4 Bagian 9). Tata letak penuh ≥ 1280 px;
 * di bawahnya kolom menumpuk, dan di bawah 1024 px navigasi pindah ke bilah atas.
 */
import { BarChart3, FileText, KeyRound, LogOut, ScrollText, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router";
import { IsianTeks } from "@/components/Isian";
import { Logo } from "@/components/Shell";
import { DataContoh, Pemberitahuan, Tombol, cx } from "@/components/ui";
import { GalatAdmin, LABEL_PERAN, panggilAdmin, tokenAdmin, type Saya } from "@/lib/admin";
import Dasbor from "./Dasbor";
import KlausulAdmin from "./Klausul";
import LaporanMitra from "./Mitra";
import LogPemeriksa from "./Log";
import Parameter from "./Parameter";
import PenggunaAdmin from "./Pengguna";

/** Muat data admin dengan keadaan memuat dan galat. */
export function useMuat<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const muat = useCallback(() => {
    setGalat(null);
    panggilAdmin<T>(path)
      .then(setData)
      .catch((e: GalatAdmin) => setGalat(e.message));
  }, [path]);
  useEffect(muat, [muat]);
  return { data, galat, muat, setData };
}

export function KepalaAdmin({ judul, sub, aksi, contoh }: { judul: string; sub: string; aksi?: ReactNode; contoh?: boolean }) {
  useEffect(() => {
    document.title = `${judul} · Admin RAMBU`;
  }, [judul]);
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="t-h1">{judul}</h1>
        <p className="mt-1 text-text2">{sub}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {aksi}
        {contoh && <DataContoh />}
      </div>
    </header>
  );
}

export function Memuat({ galat }: { galat: string | null }) {
  if (galat) return <Pemberitahuan nada="red">{galat}</Pemberitahuan>;
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-sunken motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-2xl bg-sunken motion-reduce:animate-none" />
    </div>
  );
}

function Masuk({ onMasuk }: { onMasuk: (s: Saya) => void }) {
  const [token, setToken] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return setGalat("Isi token admin.");
    setSibuk(true);
    tokenAdmin.set(token.trim());
    try {
      onMasuk(await panggilAdmin<Saya>("/api/admin/saya"));
    } catch (err) {
      tokenAdmin.hapus();
      setGalat((err as Error).message);
    } finally {
      setSibuk(false);
    }
  };
  useEffect(() => {
    document.title = "Masuk · Admin RAMBU";
  }, []);
  return (
    <main id="isi" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="kartu w-full max-w-md p-8">
        <Logo />
        <h1 className="t-h1 mt-6">Panel admin dan mitra</h1>
        <p className="mt-1.5 text-text2">Untuk tim RAMBU dan mitra. Tidak ada data personal pengguna di panel ini.</p>
        <form onSubmit={kirim} className="mt-6 space-y-4" noValidate>
          <IsianTeks label="Token admin" name="token" nilai={token} onNilai={setToken} autoComplete="off" galat={galat} petunjuk="Diberikan superadmin lewat kanal aman. Token hanya disimpan di tab ini." />
          <Tombol type="submit" blok ikon={KeyRound} disabled={sibuk}>
            {sibuk ? "Memeriksa…" : "Masuk"}
          </Tombol>
        </form>
      </div>
    </main>
  );
}

const NAV = [
  { ke: "/admin", label: "Dasbor", Ikon: BarChart3, izin: "lihat_dasbor", akhir: true },
  { ke: "/admin/parameter", label: "Parameter", Ikon: SlidersHorizontal, izin: "ajukan_parameter|setujui_parameter|lihat_dasbor" },
  { ke: "/admin/klausul", label: "Konten klausul", Ikon: FileText, izin: "sunting_klausul|lihat_log_pemeriksa" },
  { ke: "/admin/log", label: "Log pemeriksa", Ikon: ShieldCheck, izin: "lihat_log_pemeriksa" },
  { ke: "/admin/pengguna", label: "Pengguna admin", Ikon: Users, izin: "kelola_admin" },
  { ke: "/admin/mitra", label: "Laporan mitra", Ikon: ScrollText, izin: "lihat_laporan_mitra" },
];

export default function Admin() {
  const [saya, setSaya] = useState<Saya | null>(null);
  const [cek, setCek] = useState(!!tokenAdmin.get());
  const nav = useNavigate();
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    if (!tokenAdmin.get()) return;
    panggilAdmin<Saya>("/api/admin/saya")
      .then(setSaya)
      .catch(() => tokenAdmin.hapus())
      .finally(() => setCek(false));
  }, []);
  if (cek) return <div className="min-h-dvh" aria-busy="true" />;
  if (!saya) return <Masuk onMasuk={setSaya} />;

  const boleh = (izin: string) => izin.split("|").some((i) => saya.izin.includes(i));
  const menu = NAV.filter((n) => boleh(n.izin));
  const beranda = menu[0]?.ke ?? "/admin";
  const keluar = () => {
    tokenAdmin.hapus();
    setSaya(null);
    nav("/admin");
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:p-0 lg:px-2">
          <Logo />
          <button type="button" onClick={keluar} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text2 hover:bg-sunken lg:hidden">
            <LogOut aria-hidden className="size-4" /> Keluar
          </button>
        </div>
        <nav aria-label="Navigasi admin" className="overflow-x-auto px-2 pb-2 lg:mt-8 lg:overflow-visible lg:p-0">
          <ul className="flex gap-1 lg:flex-col">
            {menu.map(({ ke, label, Ikon, akhir }) => (
              <li key={ke} className="shrink-0">
                <NavLink
                  to={ke}
                  end={akhir}
                  className={({ isActive }) => cx("flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold whitespace-nowrap transition-colors lg:min-h-12", isActive ? "bg-tint text-teal-d" : "text-text2 hover:bg-sunken hover:text-ink")}
                >
                  <Ikon aria-hidden className="size-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto hidden lg:block">
          <div className="kartu p-4">
            <p className="text-sm text-text2">Masuk sebagai</p>
            <p className="font-bold text-ink">{LABEL_PERAN[saya.peran]}</p>
            <p className="text-sm text-muted">{saya.peran === "mitra" ? "Akses hanya baca, agregat anonim" : "Dua orang untuk menerbitkan"}</p>
            <p className="mt-2 truncate text-caption text-muted">{saya.nama}</p>
          </div>
          <Tombol varian="teks" ikon={LogOut} className="mt-2 w-full justify-start" onClick={keluar}>
            Keluar
          </Tombol>
        </div>
      </aside>
      <main id="isi" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1280px]">
          <Routes>
            <Route index element={boleh("lihat_dasbor") ? <Dasbor /> : <Navigate to={beranda} replace />} />
            <Route path="parameter" element={<Parameter saya={saya} />} />
            <Route path="klausul" element={<KlausulAdmin saya={saya} />} />
            <Route path="log" element={<LogPemeriksa contoh={saya.data_contoh} />} />
            <Route path="pengguna" element={<PenggunaAdmin contoh={saya.data_contoh} />} />
            <Route path="mitra" element={<LaporanMitra />} />
            <Route path="*" element={<Navigate to={beranda} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
