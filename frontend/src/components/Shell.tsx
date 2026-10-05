/**
 * Kerangka aplikasi Peminjam. Ponsel/tablet: tab bar bawah 5 item (PRD 7.8).
 * Desktop ≥ 1024 px: sidebar 248 px. Halaman alur dan detail menyembunyikan tab bar di ponsel.
 */
import { ArrowLeft, Calculator, CalendarDays, HeartHandshake, House, List, Monitor, Moon, Sun, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { cx } from "./ui";

export function Logo({ ukuran = 32, tulisan = true, className }: { ukuran?: number; tulisan?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <img src="/logo-mark-128.png" width={ukuran} height={ukuran} alt="" className="shrink-0" decoding="async" />
      {tulisan && (
        <span translate="no" className="text-lg font-extrabold tracking-[0.22em] text-ink">
          RAMBU
        </span>
      )}
    </span>
  );
}

// --- Tema (mengikuti sistem sebagai bawaan; bisa dipaksa di Saya) -----------------

export type Tema = "terang" | "gelap" | "sistem";

function terapkanTema(t: Tema) {
  const gelap = t === "gelap" || (t === "sistem" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", gelap);
  root.style.colorScheme = gelap ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", gelap ? "#0b1220" : "#f8fafc");
}

const pendengarTema = new Set<(t: Tema) => void>();
export function useTema() {
  const [tema, setTemaLokal] = useState<Tema>(() => (localStorage.getItem("rambu-tema") as Tema) || "sistem");
  useEffect(() => {
    const f = (t: Tema) => setTemaLokal(t);
    pendengarTema.add(f);
    return () => {
      pendengarTema.delete(f);
    };
  }, []);
  useEffect(() => {
    terapkanTema(tema);
    if (tema !== "sistem") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const f = () => terapkanTema("sistem");
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [tema]);
  const setTema = (t: Tema) => {
    localStorage.setItem("rambu-tema", t);
    pendengarTema.forEach((f) => f(t));
  };
  return [tema, setTema] as const;
}

export function PilihTema() {
  const [tema, setTema] = useTema();
  const opsi: { t: Tema; label: string; Ikon: typeof Sun }[] = [
    { t: "sistem", label: "Ikuti sistem", Ikon: Monitor },
    { t: "terang", label: "Terang", Ikon: Sun },
    { t: "gelap", label: "Gelap", Ikon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Tampilan" className="flex rounded-[14px] bg-sunken p-1">
      {opsi.map(({ t, label, Ikon }) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={tema === t}
          aria-label={label}
          title={label}
          onClick={() => setTema(t)}
          className={cx(
            "grid min-h-10 flex-1 place-items-center rounded-[11px] transition-colors",
            tema === t ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-text2 hover:text-ink",
          )}
        >
          <Ikon aria-hidden className="size-[18px]" />
        </button>
      ))}
    </div>
  );
}

// --- Navigasi --------------------------------------------------------------------

const TAB = [
  { ke: "/beranda", label: "Beranda", Ikon: House },
  { ke: "/cek", label: "Cek", Ikon: Calculator },
  { ke: "/pinjamanku", label: "Pinjamanku", Ikon: List },
  { ke: "/jadwal", label: "Jadwal", Ikon: CalendarDays },
  { ke: "/saya", label: "Saya", Ikon: User },
] as const;

export interface PeganganRute {
  /** Tampilkan tab bar di ponsel (layar tingkat atas) */
  tab?: boolean;
  /** Halaman tanpa kerangka (onboarding) */
  polos?: boolean;
}

function TabBar() {
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden">
      <ul className="mx-auto flex max-w-xl">
        {TAB.map(({ ke, label, Ikon }) => (
          <li key={ke} className="flex-1">
            <NavLink
              to={ke}
              className={({ isActive }) =>
                cx("flex min-h-16 flex-col items-center justify-center gap-1 text-[12.5px] font-semibold transition-colors", isActive ? "text-teal" : "text-text2 hover:text-ink")
              }
            >
              {({ isActive }) => (
                <>
                  <Ikon aria-hidden className="size-6" strokeWidth={isActive ? 2.25 : 1.75} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link to="/beranda" className="flex min-h-11 items-center px-3" aria-label="RAMBU, ke Beranda">
        <Logo />
      </Link>
      <nav aria-label="Navigasi utama" className="mt-8">
        <ul className="space-y-1">
          {TAB.map(({ ke, label, Ikon }) => (
            <li key={ke}>
              <NavLink
                to={ke}
                className={({ isActive }) =>
                  cx("flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold transition-colors", isActive ? "bg-tint text-teal-d" : "text-text2 hover:bg-sunken hover:text-ink")
                }
              >
                <Ikon aria-hidden className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto space-y-4">
        <Link to="/bantuan?dari=lain" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-text2 hover:bg-sunken hover:text-ink">
          <HeartHandshake aria-hidden className="size-5" />
          Butuh bantuan
        </Link>
        <div className="px-1">
          <p className="mb-2 px-2 text-caption font-semibold text-muted">Tampilan</p>
          <PilihTema />
        </div>
      </div>
    </aside>
  );
}

function LewatiKeIsi() {
  return (
    <a href="#isi" className="sr-only z-50 rounded-xl bg-teal px-4 py-3 font-semibold text-on-teal focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      Lompat ke isi
    </a>
  );
}

export function KerangkaPeminjam() {
  const matches = useMatches();
  const pegangan = (matches.at(-1)?.handle ?? {}) as PeganganRute;
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  if (pegangan.polos)
    return (
      <>
        <LewatiKeIsi />
        <Outlet />
      </>
    );
  return (
    <div className="flex min-h-dvh">
      <LewatiKeIsi />
      <Sidebar />
      <div className={cx("min-w-0 flex-1", pegangan.tab && "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0")}>
        <Outlet />
      </div>
      {pegangan.tab && <TabBar />}
    </div>
  );
}

// --- Halaman ---------------------------------------------------------------------

/**
 * Kerangka satu halaman: bilah atas (kembali, judul, slot kanan), isi, dan aksi bawah.
 * Aksi bawah menempel di ponsel dan menjadi bagian isi di desktop.
 */
export function Halaman({
  judul,
  judulVisual,
  kembali,
  kanan,
  langkah,
  aksi,
  lebar = "sedang",
  children,
  tanpaBilah,
}: {
  judul: string;
  /** Judul besar di isi (mis. "Selamat pagi"); bila ada, bilah atas hanya menampilkan logo di ponsel */
  judulVisual?: ReactNode;
  kembali?: string | true;
  kanan?: ReactNode;
  langkah?: { ke: number; dari: number };
  aksi?: ReactNode;
  lebar?: "sempit" | "sedang" | "lebar";
  children: ReactNode;
  tanpaBilah?: boolean;
}) {
  const nav = useNavigate();
  useEffect(() => {
    document.title = `${judul} · RAMBU`;
  }, [judul]);
  const maks = lebar === "sempit" ? "max-w-xl" : lebar === "sedang" ? "max-w-3xl lg:max-w-[1120px]" : "max-w-[1120px]";
  return (
    <>
      {!tanpaBilah && (
        <header className="sticky top-0 z-10 border-b border-transparent bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
          <div className={cx("mx-auto flex min-h-16 items-center gap-2 px-4 sm:px-6 lg:px-10", maks)}>
            {kembali ? (
              <button
                type="button"
                onClick={() => (kembali === true ? nav(-1) : nav(kembali))}
                aria-label="Kembali"
                className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-sunken"
              >
                <ArrowLeft aria-hidden className="size-6" />
              </button>
            ) : (
              <Link to="/beranda" aria-label="RAMBU, ke Beranda" className="flex min-h-11 items-center lg:hidden">
                <Logo ukuran={28} />
              </Link>
            )}
            {(kembali || !judulVisual) && <h1 className={cx("min-w-0 flex-1 truncate text-lg font-bold text-ink", !kembali && "lg:block hidden")}>{judul}</h1>}
            {!kembali && judulVisual && <span className="flex-1" />}
            {langkah && (
              <span className="shrink-0 text-sm font-medium text-muted" aria-label={`Langkah ${langkah.ke} dari ${langkah.dari}`}>
                {langkah.ke} dari {langkah.dari}
              </span>
            )}
            {kanan}
          </div>
        </header>
      )}
      <main id="isi" tabIndex={-1} className={cx("mx-auto w-full px-4 pt-2 pb-8 outline-none sm:px-6 lg:px-10 lg:pt-6", maks, !!aksi && "pb-32 lg:pb-12")}>
        {judulVisual && <div className="mb-5 lg:mb-8">{judulVisual}</div>}
        {children}
        {aksi && <div className="mt-8 hidden lg:block">{aksi}</div>}
      </main>
      {aksi && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-canvas/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] backdrop-blur sm:px-6 lg:hidden">
          <div className="mx-auto max-w-3xl">{aksi}</div>
        </div>
      )}
    </>
  );
}
