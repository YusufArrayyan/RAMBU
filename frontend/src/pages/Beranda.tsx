/**
 * S05 Beranda (dasbor Peminjam). Kewajiban bulan ini, rasio terhadap penghasilan, cicilan
 * berikutnya, jalan pintas ke Cek dan Bantuan. Mode tamu: banner pengingat dalam aplikasi (ING-06).
 */
import { Bell, Calculator, CalendarPlus, ChevronRight, Heart, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BilahRasio, LencanaPatokan } from "@/components/Bilah";
import { LembarCatatBayar, type TargetBayar } from "@/components/CatatBayar";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, LencanaStatus, TautanTombol, Tombol } from "@/components/ui";
import { persen, rupiah, rupiahKata } from "@/lib/format";
import { BULAN_PANJANG, cicilanBerikutnya, hariIni, pemicuKartuLembut, ringkasanBulan, tglPendek } from "@/lib/jadwal";
import { bannerHariIni } from "@/lib/pengingat";
import { versiAktif } from "@/lib/regulasi";
import { useApp } from "@/state/app";

function sapaan() {
  const j = new Date().getHours();
  if (j < 4) return "Selamat malam";
  if (j < 11) return "Selamat pagi";
  if (j < 15) return "Selamat siang";
  if (j < 18) return "Selamat sore";
  return "Selamat malam";
}

function teksHari(n: number) {
  if (n === 0) return "hari ini";
  if (n === 1) return "besok";
  if (n > 0) return `${n} hari lagi`;
  if (n === -1) return "kemarin";
  return `${-n} hari lalu`;
}

export default function Beranda() {
  const { data, aksi } = useApp();
  const toast = useToast();
  const [target, setTarget] = useState<TargetBayar | null>(null);
  const hari = hariIni();
  const bulan = hari.slice(0, 7);
  const patokan = versiAktif().patokan_rasio.persen;
  const I = data.profil.penghasilan;
  const ringkas = useMemo(() => ringkasanBulan(data.pinjaman, bulan, I), [data.pinjaman, bulan, I]);
  const berikut = useMemo(() => cicilanBerikutnya(data.pinjaman).slice(0, 3), [data.pinjaman]);
  // Banner dalam aplikasi untuk tamu (ING-06), dan untuk akun yang belum menyalakan kanal server mana pun.
  const tanpaKanalServer = data.mode !== "akun" || (!data.pengingat.push && !data.pengingat.email);
  const banner = useMemo(() => (tanpaKanalServer ? bannerHariIni(data.pinjaman, data.pengingat, hari) : []), [tanpaKanalServer, data.pinjaman, data.pengingat, hari]);
  const lembut = pemicuKartuLembut(data.pinjaman, ringkas.rasioPersen) && data.kartuLembutDitutup !== bulan;
  const namaBulan = BULAN_PANJANG[Number(bulan.slice(5)) - 1];
  const adaPinjaman = data.pinjaman.length > 0;

  return (
    <Halaman
      judul="Beranda"
      lebar="lebar"
      judulVisual={<h1 className="t-h1 text-[30px] leading-[38px]">{sapaan()}</h1>}
      kanan={
        <Link to="/saya/notifikasi" aria-label="Pengingat dan notifikasi" className="relative -mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
          <Bell aria-hidden className="size-6" />
          {banner.length > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-amber-bar ring-2 ring-canvas" aria-hidden />}
        </Link>
      }
    >
      {banner.length > 0 && (
        <ul aria-label="Pengingat hari ini" className="mb-4 space-y-2">
          {banner.map((n) => (
            <li key={n.id} className="kartu-perhatian flex items-start gap-3 px-4 py-3">
              <Bell aria-hidden className="mt-0.5 size-5 shrink-0 text-amber" />
              <div className="min-w-0 flex-1 text-[0.9375rem] font-medium text-amber">
                {n.isi}
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <Link to="/pinjamanku" className="font-bold underline underline-offset-2">
                    Tandai di Pinjamanku
                  </Link>
                  <Link to={`/saya/notifikasi#${n.id}`} className="underline underline-offset-2">
                    Kenapa pengingat ini muncul?
                  </Link>
                  {n.tawarkanBantuan && (
                    <Link to="/bantuan?dari=notifikasi" className="underline underline-offset-2">
                      Pilihan bantuan
                    </Link>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Kartu className="lg:col-span-7" aria-labelledby="kewajiban">
          <h2 id="kewajiban" className="label-kartu">
            Kewajiban {namaBulan}
          </h2>
          {adaPinjaman ? (
            <>
              <p className="t-display mt-1" aria-label={rupiahKata(ringkas.total)}>
                {rupiah(ringkas.total)}
              </p>
              {ringkas.rasioPersen !== null ? (
                <div className="mt-4 space-y-3">
                  <LencanaPatokan diAtas={ringkas.rasioPersen > patokan} patokan={patokan} />
                  <p className="sr-only">{persen(ringkas.rasioPersen)} dari penghasilan</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text2">Dari penghasilan</span>
                    <span className="angka font-bold text-ink">{persen(ringkas.rasioPersen)}</span>
                  </div>
                  <BilahRasio nilai={ringkas.rasioPersen} patokan={patokan} label={`Kewajiban ${namaBulan}`} tampilSkala tebal />
                </div>
              ) : (
                <p className="mt-3 text-text2">
                  Rasio terhadap penghasilan tidak dapat dihitung.{" "}
                  <Link to="/saya/profil" className="tautan">
                    Isi penghasilan
                  </Link>
                </p>
              )}
              <dl className="mt-5 flex items-start justify-between gap-4 border-t border-line pt-4">
                <dt className="text-text2">Sudah ditandai dibayar</dt>
                <dd className="angka text-right font-bold text-ink">
                  {rupiah(ringkas.sudahDitandai)} dari {rupiah(ringkas.total)}
                </dd>
              </dl>
              {ringkas.rasioPersen !== null && (
                <Link to="/jadwal/ringkasan" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-teal hover:underline">
                  <Info aria-hidden className="size-5" />
                  Kenapa {persen(ringkas.rasioPersen)}? Lihat penjelasannya
                </Link>
              )}
            </>
          ) : (
            <div className="mt-2">
              <p className="t-display text-muted">Rp0</p>
              <p className="mt-3 text-text2">Belum ada pinjaman yang dicatat. Catat pinjaman yang sudah kamu ambil agar jadwal dan pengingatnya ada di satu tempat.</p>
              <TautanTombol to="/pinjamanku/tambah" varian="kedua" ikon={CalendarPlus} className="mt-4">
                Tambah pinjaman
              </TautanTombol>
            </div>
          )}
        </Kartu>

        <Kartu className="lg:col-span-5" aria-labelledby="berikutnya">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="berikutnya" className="t-h2">
              Berikutnya
            </h2>
            <Link to="/jadwal" className="inline-flex min-h-11 items-center font-semibold text-teal hover:underline">
              Lihat jadwal
            </Link>
          </div>
          {berikut.length === 0 ? (
            <p className="mt-3 text-text2">{adaPinjaman ? "Semua cicilan sudah ditandai dibayar." : "Belum ada cicilan terjadwal."}</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {berikut.map((c, i) => (
                <li key={c.cicilan.id} className="py-4 first:pt-3 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/pinjamanku/${c.pinjaman.id}`} className="min-w-0 font-bold text-ink hover:underline">
                      {c.pinjaman.nama}
                    </Link>
                    <span className="angka shrink-0 font-bold text-ink">{rupiah(c.sisa)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-text2">
                      {tglPendek(c.cicilan.jatuhTempo)} · {teksHari(c.hariLagi)}
                    </span>
                    {i === 0 || c.status === "terlambat" || c.status === "jatuh_tempo" ? (
                      <Tombol kecil varian="kedua" onClick={() => setTarget({ pinjamanId: c.pinjaman.id, info: c })}>
                        Tandai sudah bayar
                      </Tombol>
                    ) : (
                      <LencanaStatus status={c.status} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        {lembut && (
          <Kartu className="flex items-start gap-4 lg:col-span-12">
            <Heart aria-hidden className="mt-0.5 size-6 shrink-0 text-teal" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">Bulan ini terasa berat?</p>
              <p className="mt-0.5 text-text2">Ada cara bicara dengan pemberi pinjaman soal keringanan, dan layanan yang bisa dihubungi.</p>
              <Link to="/bantuan?dari=beranda" className="mt-2 inline-flex min-h-11 items-center font-semibold text-teal hover:underline">
                Lihat pilihan bantuan
              </Link>
            </div>
            <button type="button" onClick={aksi.tutupKartuLembut} aria-label="Tutup kartu ini" className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text2 hover:bg-sunken">
              <X aria-hidden className="size-5" />
            </button>
          </Kartu>
        )}

        <Kartu varian="tint" className="lg:col-span-12 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div>
            <h2 className="t-h2">Dapat tawaran pinjaman baru?</h2>
            <p className="mt-1.5 text-text2">Hitung biaya sebenarnya sebelum setuju. Cicilan yang sudah ada ikut dihitung.</p>
          </div>
          <TautanTombol to="/cek" blok ikon={Calculator} className="mt-4 lg:mt-0 lg:w-auto lg:shrink-0 lg:px-8">
            Cek penawaran
          </TautanTombol>
        </Kartu>
      </div>

      <Link to="/bantuan?dari=beranda" className="mx-auto mt-6 flex min-h-12 w-fit items-center gap-2 font-semibold text-text2 hover:text-ink">
        <Heart aria-hidden className="size-5" />
        Bulan ini terasa berat? Lihat pilihan bantuan
        <ChevronRight aria-hidden className="size-4" />
      </Link>

      <LembarCatatBayar target={target} onTutup={() => setTarget(null)} onSelesai={toast} />
    </Halaman>
  );
}
