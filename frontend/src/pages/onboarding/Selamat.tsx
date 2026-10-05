/** S01 Selamat datang (ONB-01). */
import { Calculator, Lock, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, Navigate } from "react-router";
import { Logo } from "@/components/Shell";
import { LabelPerkiraan, TautanTombol } from "@/components/ui";
import { useApp } from "@/state/app";

const POIN = [
  { Ikon: Calculator, judul: "Angka bisa kamu cek", isi: "Dari rumus tetap, bukan tebakan AI." },
  { Ikon: ShieldCheck, judul: "Tidak menyuruh pinjam", isi: "Keputusan sepenuhnya ada padamu." },
  { Ikon: Lock, judul: "Datamu milikmu", isi: "Tetap di perangkat kecuali kamu pilih lain." },
];

export default function Selamat() {
  const { data } = useApp();
  useEffect(() => {
    document.title = "RAMBU · Pahami pinjamanmu sebelum setuju";
  }, []);
  if (data.mode) return <Navigate to="/beranda" replace />;
  return (
    <main id="isi" className="mx-auto flex min-h-dvh max-w-[1120px] flex-col px-5 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10 lg:py-16">
      <div className="flex flex-1 flex-col lg:flex-none">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <img src="/logo-mark.png" alt="" width={112} height={112} className="size-24 lg:size-20" />
          <h1 className="t-h1 mt-6 max-w-[18ch] text-[28px] leading-[36px] lg:text-[44px] lg:leading-[52px]">Pahami pinjamanmu sebelum setuju.</h1>
          <p className="prosa mt-3 text-[1.0625rem] leading-relaxed text-text2">
            RAMBU menghitung biaya sebenarnya, mengingatkan jadwal bayar, dan menjelaskan angkanya dengan bahasa sehari-hari.
          </p>
        </div>
        <ul className="mt-8 space-y-4">
          {POIN.map(({ Ikon, judul, isi }) => (
            <li key={judul} className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tint text-teal">
                <Ikon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-ink">{judul}</span>
                <span className="block text-text2">{isi}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-2 pt-10 lg:mt-10 lg:flex lg:items-center lg:gap-4 lg:space-y-0 lg:pt-0">
          <TautanTombol to="/cara-pakai" blok className="lg:w-auto lg:px-10">
            Mulai
          </TautanTombol>
          <TautanTombol to="/cara-hitung" varian="teks" blok className="lg:w-auto">
            Lihat cara kerja RAMBU
          </TautanTombol>
        </div>
        <p className="mt-4 text-center text-sm text-muted lg:text-left">Semua hasil adalah perkiraan. RAMBU tidak menyalurkan pinjaman.</p>
      </div>

      {/* Desktop: pratinjau hasil (data contoh) agar nilai produk terlihat dalam satu layar */}
      <div aria-hidden className="hidden lg:block">
        <div className="kartu p-7 shadow-[0_24px_60px_-28px_rgb(15_23_42/0.25)]">
          <div className="flex items-center justify-between">
            <Logo ukuran={26} />
            <LabelPerkiraan />
          </div>
          <p className="t-h1 mt-6">Kamu menerima Rp2.940.000, tapi membayar Rp3.270.000</p>
          <dl className="mt-6 divide-y divide-line">
            {[
              ["Biaya pinjaman", "Rp330.000"],
              ["Cicilan", "3 × Rp1.090.000"],
              ["Bersama cicilan lain", "34,8% dari penghasilan"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-3">
                <dt>{k}</dt>
                <dd className="angka font-bold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl bg-amber-soft px-4 py-3 text-sm font-semibold text-amber">Di atas patokan 30%: lihat apa yang harus berubah agar muat.</div>
          <p className="mt-4 text-caption text-muted">Data contoh rekaan (persona Dina).</p>
        </div>
      </div>
      <Link to="/bantuan?dari=lain" className="sr-only focus:not-sr-only">
        Butuh bantuan
      </Link>
    </main>
  );
}
