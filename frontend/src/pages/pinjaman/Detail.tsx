/** S18 Detail pinjaman (PIN-04, PIN-05, PIN-06) dengan S19 Catat bayar. */
import { Bell, CalendarDays, CircleCheck, Clock, FileText, Info, MoreVertical, Pencil, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { LembarCatatBayar, type TargetBayar } from "@/components/CatatBayar";
import { IsianTeks } from "@/components/Isian";
import { BlokRumus, Lembar } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, Lencana, LencanaStatus, TautanTombol, Tombol, cx } from "@/components/ui";
import { angka, persen, rupiah, rupiahKata } from "@/lib/format";
import { infoPinjaman, sudahDibayar, tglPanjang, type InfoCicilan } from "@/lib/jadwal";
import { useApp } from "@/state/app";

function teksHari(c: InfoCicilan) {
  if (sudahDibayar(c.status)) return null;
  if (c.hariLagi === 0) return "hari ini";
  if (c.hariLagi > 0) return `${c.hariLagi} hari lagi`;
  return `lewat ${-c.hariLagi} hari`;
}

function IkonCicilan({ c }: { c: InfoCicilan }) {
  const Ikon = sudahDibayar(c.status) ? CircleCheck : c.status === "terlambat" || c.status === "jatuh_tempo" ? TriangleAlert : c.status === "mendekati" ? Clock : CalendarDays;
  return (
    <span
      aria-hidden
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-xl",
        sudahDibayar(c.status) ? "bg-tint text-teal" : c.status === "terlambat" ? "bg-red-soft text-red" : c.status === "mendekati" || c.status === "jatuh_tempo" ? "bg-amber-soft text-amber" : "bg-sunken text-text2",
      )}
    >
      <Ikon className="size-5" />
    </span>
  );
}

export default function Detail() {
  const { id } = useParams();
  const { data, aksi } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [target, setTarget] = useState<TargetBayar | null>(null);
  const [menu, setMenu] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [ubahTgl, setUbahTgl] = useState<InfoCicilan | null>(null);
  const [tglBaru, setTglBaru] = useState("");
  const [ubahNama, setUbahNama] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");
  const [telusur, setTelusur] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const p = data.pinjaman.find((x) => x.id === id);

  useEffect(() => {
    if (!menu) return;
    const tutup = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  if (!p) return <Navigate to="/pinjamanku" replace />;
  const info = infoPinjaman(p);
  const berikut = info.berikutnya;

  return (
    <Halaman
      judul={p.nama}
      kembali="/pinjamanku"
      kanan={
        <div ref={menuRef} className="relative">
          <button type="button" aria-label="Pilihan lain" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)} className="-mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
            <MoreVertical aria-hidden className="size-6" />
          </button>
          {menu && (
            <div role="menu" className="muncul absolute top-12 right-0 z-30 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-sheet)]">
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setNamaBaru(p.nama);
                  setUbahNama(true);
                  setMenu(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-ink hover:bg-sunken"
              >
                <Pencil aria-hidden className="size-4" /> Ubah nama
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setHapus(true);
                  setMenu(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-red hover:bg-red-soft"
              >
                <Trash2 aria-hidden className="size-4" /> Hapus pinjaman
              </button>
            </div>
          )}
        </div>
      }
      aksi={
        <div className="space-y-2">
          {berikut && (
            <Tombol blok onClick={() => setTarget({ pinjamanId: p.id, info: berikut })}>
              Catat pembayaran
            </Tombol>
          )}
          <div className="grid grid-cols-2 gap-2">
            <TautanTombol to="/saya/pengingat" varian="kedua" kecil ikon={Bell}>
              Pengingat
            </TautanTombol>
            <TautanTombol to="/cek/klausul" varian="kedua" kecil ikon={FileText}>
              Klausul
            </TautanTombol>
          </div>
        </div>
      }
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-24">
          <Kartu>
            <div className="flex items-start justify-between gap-3">
              <p className="label-kartu">Sisa kewajiban</p>
              <Lencana nada={info.selesai ? "netral" : "teal"}>{info.selesai ? "Selesai" : "Aktif"}</Lencana>
            </div>
            <p className="t-display mt-1" aria-label={rupiahKata(info.sisaKewajiban)}>
              {rupiah(info.sisaKewajiban)}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-chip">
              <div className="isi-bilah h-full w-full rounded-full bg-teal" style={{ transform: `scaleX(${info.jumlahDibayar / Math.max(1, info.cicilan.length)})` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm text-muted">
              <span>
                {info.jumlahDibayar} dari {info.cicilan.length} cicilan lunas
              </span>
              <span className="angka">Total {rupiah(info.totalKewajiban)}</span>
            </div>
            {info.selesai && <p className="mt-4 rounded-xl bg-tint px-4 py-3 font-medium text-teal-d">Semua cicilan sudah ditandai dibayar. Pinjaman ini dipindah ke Selesai.</p>}
            {p.penyelenggara && <p className="mt-3 text-sm text-muted">Penyelenggara: {p.penyelenggara}</p>}
          </Kartu>

          {p.cek && (
            <Kartu>
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-text2">Biaya pinjaman</dt>
                  <dd className="angka font-bold text-ink">{rupiah(p.cek.biaya)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text2">Biaya efektif per hari</dt>
                  <dd className="angka font-bold text-ink">{persen(p.cek.efektifHarianPersen, 2)}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => setTelusur(true)} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-teal hover:underline">
                <Info aria-hidden className="size-4" /> Lihat dari mana angka ini
              </button>
            </Kartu>
          )}
        </div>

        <Kartu className="mt-4 lg:mt-0" aria-labelledby="jadwal">
          <h2 id="jadwal" className="t-h2">
            Jadwal
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {info.cicilan.map((c) => (
              <li key={c.cicilan.id} className="flex items-start gap-3 py-3.5">
                <IkonCicilan c={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-ink">Cicilan {c.cicilan.ke}</p>
                    <p className="angka font-bold text-ink">{rupiah(c.cicilan.jumlah)}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-text2">
                      {tglPanjang(c.cicilan.jatuhTempo)}
                      {teksHari(c) && ` · ${teksHari(c)}`}
                      {c.dibayar > 0 && !sudahDibayar(c.status) && ` · dibayar ${rupiah(c.dibayar)}, sisa ${rupiah(c.sisa)}`}
                    </p>
                    <LencanaStatus status={c.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-1">
                    {!sudahDibayar(c.status) ? (
                      <>
                        <Tombol varian="teks" kecil className="-ml-3" onClick={() => setTarget({ pinjamanId: p.id, info: c })}>
                          Tandai dibayar
                        </Tombol>
                        <Tombol
                          varian="teks"
                          kecil
                          onClick={() => {
                            setTglBaru(c.cicilan.jatuhTempo);
                            setUbahTgl(c);
                          }}
                        >
                          Ubah tanggal
                        </Tombol>
                      </>
                    ) : (
                      <Tombol
                        varian="teks"
                        kecil
                        ikon={Undo2}
                        className="-ml-3"
                        onClick={() => {
                          aksi.batalkanBayar(p.id, c.cicilan.id);
                          toast("Tanda dibayar dibatalkan. Pengingat untuk cicilan ini aktif lagi.");
                        }}
                      >
                        Batalkan tanda
                      </Tombol>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Catatanmu, bukan data penyelenggara. Cocokkan dengan aplikasi pinjamanmu.</p>
        </Kartu>
      </div>

      <LembarCatatBayar target={target} onTutup={() => setTarget(null)} onSelesai={toast} />

      <Lembar buka={!!ubahTgl} onTutup={() => setUbahTgl(null)} judul={`Ubah tanggal cicilan ${ubahTgl?.cicilan.ke ?? ""}`} kaki={
        <Tombol
          blok
          disabled={!tglBaru}
          onClick={() => {
            if (ubahTgl && tglBaru) aksi.ubahTanggalCicilan(p.id, ubahTgl.cicilan.id, tglBaru);
            setUbahTgl(null);
            toast("Tanggal jatuh tempo diubah. Pengingat ikut menyesuaikan.");
          }}
        >
          Simpan tanggal
        </Tombol>
      }>
        <IsianTeks label="Jatuh tempo" name="tgl" type="date" nilai={tglBaru} onNilai={setTglBaru} petunjuk="Hanya cicilan ini yang berubah." />
      </Lembar>

      <Lembar buka={ubahNama} onTutup={() => setUbahNama(false)} judul="Ubah nama pinjaman" kaki={
        <Tombol
          blok
          onClick={() => {
            if (namaBaru.trim()) aksi.ubahNamaPinjaman(p.id, namaBaru.trim());
            setUbahNama(false);
          }}
        >
          Simpan
        </Tombol>
      }>
        <IsianTeks label="Nama pinjaman" name="nama" nilai={namaBaru} onNilai={setNamaBaru} maxLength={40} />
      </Lembar>

      <Lembar buka={hapus} onTutup={() => setHapus(false)} judul="Hapus pinjaman ini?" kaki={
        <div className="grid grid-cols-2 gap-2">
          <Tombol varian="kedua" onClick={() => setHapus(false)}>
            Batal
          </Tombol>
          <Tombol
            varian="kedua"
            className="border-red text-red hover:bg-red-soft"
            onClick={() => {
              aksi.hapusPinjaman(p.id);
              toast(`${p.nama} dihapus beserta jadwal dan pengingatnya.`);
              nav("/pinjamanku", { replace: true });
            }}
          >
            Hapus
          </Tombol>
        </div>
      }>
        <p className="text-text2">
          Jadwal, catatan bayar, dan pengingat untuk <strong className="text-ink">{p.nama}</strong> ikut terhapus dari perangkat ini{data.mode === "akun" ? " dan dari cadangan akunmu" : ""}. Ini tidak bisa dibatalkan.
        </p>
      </Lembar>

      {p.cek && (
        <Lembar buka={telusur} onTutup={() => setTelusur(false)} judul="Dari mana biaya ini?">
          <BlokRumus
            rumus="biaya = bunga + admin = P × r × T + P × a"
            langkah={[
              `= ${angka(p.cek.pokok)} × ${angka(p.cek.bungaHarianPersen / 100, 6)} × ${p.cek.tenor} + ${angka(p.cek.pokok)} × ${angka(p.cek.adminPersen / 100, 4)}`,
              `= ${rupiah(p.cek.biaya)}`,
            ]}
          />
          <div className="mt-3">
            <BlokRumus rumus="efektif = biaya ÷ (P × T)" langkah={[`= ${angka(p.cek.biaya)} ÷ (${angka(p.cek.pokok)} × ${p.cek.tenor})`, `= ${persen(p.cek.efektifHarianPersen, 3)} per hari`]} />
          </div>
          <p className="mt-3 text-sm text-muted">Rumus sama dengan layar Biaya sebenarnya. Dihitung saat kamu memutuskan, versi parameter {p.cek.versiParameter}.</p>
          <Link to="/cara-hitung" className="mt-2 inline-flex min-h-11 items-center font-semibold text-teal">
            Cara RAMBU menghitung
          </Link>
        </Lembar>
      )}
    </Halaman>
  );
}
