/**
 * S23 Notifikasi: pengingat 14 hari ke depan sesuai aturan pilihanmu, dengan tampilan layar kunci
 * dan alasan tiap pengingat (XAI-07, PRD 6.8). Mode privasi: tanpa jumlah.
 */
import { BellOff, ChevronDown, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Halaman } from "@/components/Shell";
import { Kartu, Kosong, TautanTombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { HARI, dariIso, hariIni, tambahHari, tglPendek } from "@/lib/jadwal";
import { alasanPengingat, jadwalkanPengingat, type Notifikasi as N } from "@/lib/pengingat";
import { useApp } from "@/state/app";

function waktuTampil(n: N, hari: string) {
  const t = n.waktu.slice(0, 10);
  const jam = n.waktu.slice(11);
  if (t === hari) return `Hari ini, ${jam}`;
  if (t === tambahHari(hari, 1)) return `Besok, ${jam}`;
  return `${HARI[dariIso(t).getDay()]} ${tglPendek(t)}, ${jam}`;
}

function ItemNotif({ n, alasan, buka: bukaAwal }: { n: N; alasan: string; buka: boolean }) {
  const [buka, setBuka] = useState(bukaAwal);
  return (
    <li id={n.id} className="rounded-2xl bg-surface/95 p-4 text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.4)]">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-bold">
          <span aria-hidden className="grid size-6 place-items-center rounded-md bg-teal text-[11px] font-black text-on-teal">
            R
          </span>
          RAMBU · {n.pemicu}
        </span>
        <span className="text-muted">{waktuTampil(n, hariIni())}</span>
      </div>
      <p className="mt-2 leading-relaxed">{n.isi}</p>
      {n.tawarkanBantuan && (
        <Link to="/bantuan?dari=notifikasi" className="mt-1 inline-flex min-h-11 items-center font-semibold text-teal">
          Pilihan bantuan
        </Link>
      )}
      <button
        type="button"
        aria-expanded={buka}
        onClick={() => {
          setBuka((b) => !b);
          if (!buka) catat("notif_opened", { pemicu: n.pemicu });
        }}
        className="mt-1 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-teal"
      >
        <Info aria-hidden className="size-4" />
        Kenapa pengingat ini muncul?
        <ChevronDown aria-hidden className={cx("size-4 transition-transform", buka && "rotate-180")} />
      </button>
      {buka && <p className="rounded-xl bg-sunken p-3 text-sm leading-relaxed text-text2">{alasan}</p>}
    </li>
  );
}

export default function Notifikasi() {
  const { data } = useApp();
  const loc = useLocation();
  const hari = hariIni();
  const daftar = useMemo(
    () => jadwalkanPengingat(data.pinjaman, data.pengingat, hari, tambahHari(hari, 14), { hari, tanggalGajian: data.profil.tanggalGajian }),
    [data.pinjaman, data.pengingat, data.profil.tanggalGajian, hari],
  );
  const target = loc.hash.slice(1);
  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView({ block: "center" });
  }, [target]);

  return (
    <Halaman judul="Pengingat" kembali={true}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
        <div>
          <h2 className="t-h1 text-[22px] leading-[30px]">Pengingat 14 hari ke depan</h2>
          <p className="mt-1.5 text-text2">
            Dihitung dari jadwal di Pinjamanku dan aturan yang kamu pilih. {data.mode === "tamu" ? "Dalam mode tamu, pengingat tampil sebagai banner saat RAMBU dibuka." : "Dikirim lewat kanal yang kamu nyalakan."}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-text2">
            <li>Mode privasi: {data.pengingat.privasi ? "hidup, tanpa jumlah" : "mati, jumlah tampil"}</li>
            <li>
              Jam tenang {data.pengingat.jamTenangMulai}–{data.pengingat.jamTenangSelesai}, maksimal {data.pengingat.maksPerHari} per hari
            </li>
          </ul>
          <TautanTombol to="/saya/pengingat" varian="kedua" className="mt-4">
            Ubah aturan
          </TautanTombol>
        </div>
        <div className="mt-6 rounded-[28px] bg-gradient-to-b from-[#1e3a5f] to-[#0b1220] p-4 sm:p-5 lg:mt-0">
          <p className="mb-3 text-center text-sm font-medium text-white/80">Contoh di layar kunci</p>
          {daftar.length === 0 ? (
            <Kartu>
              <Kosong ikon={BellOff} judul="Tidak ada pengingat">
                {data.pinjaman.length ? "Tidak ada cicilan yang perlu diingatkan dalam 14 hari ke depan, atau semua aturan dimatikan." : "Belum ada pinjaman di Pinjamanku."}
              </Kosong>
            </Kartu>
          ) : (
            <ul className="space-y-3">
              {daftar.map((n) => (
                <ItemNotif key={n.id} n={n} alasan={alasanPengingat(n, data.pengingat)} buka={n.id === target} />
              ))}
            </ul>
          )}
          <p className="mt-3 text-center text-caption text-white/75">Tanpa kata menghakimi atau ancaman. Jumlah hanya tampil bila mode privasi dimatikan.</p>
        </div>
      </div>
    </Halaman>
  );
}
