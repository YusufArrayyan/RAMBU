/** S16 Daftar Pinjamanku (PIN-01, PIN-09). */
import { ListPlus, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Halaman } from "@/components/Shell";
import { Kartu, Kosong, LencanaStatus, Segmented, TautanTombol } from "@/components/ui";
import { rupiah, rupiahKata } from "@/lib/format";
import { infoPinjaman, tglPendek, type InfoPinjaman } from "@/lib/jadwal";
import { useApp } from "@/state/app";

function polaJadwal(p: InfoPinjaman) {
  const c = p.pinjaman.cicilan;
  const tanggal = Number(c[0]?.jatuhTempo.slice(8, 10));
  const sama = c.every((x) => Math.abs(x.jumlah - c[0].jumlah) < 1);
  return `${sama ? `${c.length} × ${rupiah(c[0].jumlah)}` : `${c.length} cicilan`} · tiap tanggal ${tanggal}`;
}

function KartuPinjaman({ p }: { p: InfoPinjaman }) {
  const lunas = p.jumlahDibayar;
  return (
    <Kartu as="li" className="p-0 lg:p-0">
      <Link to={`/pinjamanku/${p.pinjaman.id}`} className="block rounded-2xl p-5 hover:bg-sunken/60 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="t-h2">{p.pinjaman.nama}</h2>
          {p.berikutnya ? <LencanaStatus status={p.berikutnya.status} /> : <LencanaStatus status="dibayar" />}
        </div>
        <p className="mt-1 text-text2">{polaJadwal(p)}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-chip" role="img" aria-label={`${lunas} dari ${p.cicilan.length} cicilan lunas`}>
          <div className="isi-bilah h-full w-full rounded-full bg-teal" style={{ transform: `scaleX(${lunas / Math.max(1, p.cicilan.length)})` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>
            Cicilan {lunas} dari {p.cicilan.length} lunas
          </span>
          <span className="angka">Sisa {rupiah(p.sisaKewajiban)}</span>
        </div>
        {p.berikutnya && (
          <div className="mt-4 flex justify-between gap-3 border-t border-line pt-4">
            <span className="text-text2">Berikutnya</span>
            <span className="angka font-bold text-ink">
              {tglPendek(p.berikutnya.cicilan.jatuhTempo)} · {rupiah(p.berikutnya.sisa)}
            </span>
          </div>
        )}
      </Link>
    </Kartu>
  );
}

export default function Daftar() {
  const { data } = useApp();
  const [cari, setCari] = useSearchParams();
  const tab: "aktif" | "selesai" = cari.get("tab") === "selesai" ? "selesai" : "aktif";
  const setTab = (t: "aktif" | "selesai") => setCari(t === "aktif" ? {} : { tab: t }, { replace: true });
  const semua = useMemo(() => data.pinjaman.map((p) => infoPinjaman(p)), [data.pinjaman]);
  const aktif = semua.filter((p) => !p.selesai);
  const selesai = semua.filter((p) => p.selesai);
  const sisa = aktif.reduce((s, p) => s + p.sisaKewajiban, 0);
  const sisaCicilan = aktif.reduce((s, p) => s + p.cicilan.length - p.jumlahDibayar, 0);
  const tampil = tab === "aktif" ? aktif : selesai;

  return (
    <Halaman
      judul="Pinjamanku"
      lebar="lebar"
      judulVisual={<h1 className="t-h1">Pinjamanku</h1>}
      kanan={
        <Link to="/pinjamanku/tambah" aria-label="Tambah pinjaman" className="-mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
          <Plus aria-hidden className="size-6" />
        </Link>
      }
    >
      {data.pinjaman.length === 0 ? (
        <Kartu>
          <Kosong ikon={ListPlus} judul="Belum ada pinjaman" aksi={<TautanTombol to="/pinjamanku/tambah" ikon={Plus}>Tambah pinjaman</TautanTombol>}>
            Catat pinjaman yang sudah kamu ambil. RAMBU membuat jadwalnya dan mengingatkan tanpa menekan.
          </Kosong>
        </Kartu>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-6">
          <div className="space-y-4 lg:sticky lg:top-24">
            <Kartu>
              <p className="label-kartu">Sisa kewajiban</p>
              <p className="t-display mt-1" aria-label={rupiahKata(sisa)}>
                {rupiah(sisa)}
              </p>
              <p className="mt-1 text-text2">
                {aktif.length} pinjaman aktif · {sisaCicilan} cicilan tersisa
              </p>
            </Kartu>
            <Segmented
              label="Daftar pinjaman"
              nilai={tab}
              onNilai={setTab}
              pilihan={[
                { nilai: "aktif", label: `Aktif ${aktif.length}` },
                { nilai: "selesai", label: `Selesai ${selesai.length}` },
              ]}
            />
            <TautanTombol to="/pinjamanku/tambah" blok ikon={Plus} className="hidden lg:flex">
              Tambah pinjaman
            </TautanTombol>
            <p className="hidden text-sm text-muted lg:block">Jadwal di sini catatanmu, bukan data penyelenggara. Cocokkan dengan aplikasi pinjamanmu.</p>
          </div>
          <div className="mt-4 lg:mt-0">
            {tampil.length === 0 ? (
              <Kartu>
                <p className="text-text2">{tab === "selesai" ? "Belum ada pinjaman yang lunas. Pinjaman pindah ke sini setelah semua cicilan ditandai dibayar." : "Semua pinjaman sudah lunas."}</p>
              </Kartu>
            ) : (
              <ul className="space-y-4">
                {tampil.map((p) => (
                  <KartuPinjaman key={p.pinjaman.id} p={p} />
                ))}
              </ul>
            )}
            <TautanTombol to="/pinjamanku/tambah" blok ikon={Plus} className="mt-5 lg:hidden">
              Tambah pinjaman
            </TautanTombol>
          </div>
        </div>
      )}
    </Halaman>
  );
}
