/** S20 Kalender (JDW-01, JDW-03, JDW-04): jatuh tempo dan tanggal gajian dalam sebulan. */
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Download, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { LembarCatatBayar, type TargetBayar } from "@/components/CatatBayar";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, LencanaStatus, Segmented, Tombol, cx } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { BULAN_PANJANG, HARI, dariIso, hariIni, infoPinjaman, keIso, sudahDibayar, tambahBulan, tglPendek, type InfoCicilan, type Pinjaman, type StatusCicilan } from "@/lib/jadwal";
import { buatIcs, unduhIcs } from "@/lib/ics";
import { useApp } from "@/state/app";

export function NavJadwal({ aktif }: { aktif: "kalender" | "ringkasan" }) {
  const nav = useNavigate();
  return (
    <Segmented
      label="Tampilan jadwal"
      className="mb-5 max-w-sm"
      nilai={aktif}
      onNilai={(v) => nav(v === "kalender" ? "/jadwal" : "/jadwal/ringkasan", { replace: true })}
      pilihan={[
        { nilai: "kalender", label: "Kalender" },
        { nilai: "ringkasan", label: "Ringkasan bulanan" },
      ]}
    />
  );
}

const WARNA_TITIK: Partial<Record<StatusCicilan, string>> = {
  terjadwal: "bg-teal",
  mendekati: "bg-amber-bar",
  jatuh_tempo: "bg-amber-bar",
  terlambat: "bg-red",
  dinegosiasikan: "bg-line-strong",
  dibayar: "bg-tint-line",
  dibayar_terlambat: "bg-tint-line",
};
const LABEL_STATUS: Record<StatusCicilan, string> = {
  terjadwal: "terjadwal",
  mendekati: "mendekati",
  jatuh_tempo: "jatuh tempo",
  terlambat: "terlambat",
  dinegosiasikan: "dinegosiasikan",
  dibayar: "dibayar",
  dibayar_terlambat: "dibayar terlambat",
};

type Entri = InfoCicilan & { pinjaman: Pinjaman };

export default function Kalender() {
  const { data } = useApp();
  const toast = useToast();
  const hari = hariIni();
  const [cari, setCari] = useSearchParams();
  const bulan = /^\d{4}-\d{2}$/.test(cari.get("bulan") ?? "") ? cari.get("bulan")! : hari.slice(0, 7);
  const setBulan = (b: string) => setCari(b === hari.slice(0, 7) ? {} : { bulan: b }, { replace: true });
  const [pilih, setPilih] = useState(bulan === hari.slice(0, 7) ? hari : `${bulan}-01`);
  const [target, setTarget] = useState<TargetBayar | null>(null);
  const gajian = data.profil.tanggalGajian;

  const perTanggal = useMemo(() => {
    const m = new Map<string, Entri[]>();
    for (const p of data.pinjaman) for (const c of infoPinjaman(p).cicilan) m.set(c.cicilan.jatuhTempo, [...(m.get(c.cicilan.jatuhTempo) ?? []), { ...c, pinjaman: p }]);
    return m;
  }, [data.pinjaman]);

  const [y, mo] = bulan.split("-").map(Number);
  const awal = new Date(y, mo - 1, 1);
  const jumlahHari = new Date(y, mo, 0).getDate();
  const geser = (awal.getDay() + 6) % 7; // Senin pertama
  const sel: (string | null)[] = [...Array(geser).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => keIso(new Date(y, mo - 1, i + 1)))];
  while (sel.length % 7) sel.push(null);
  const gajianBulan = gajian ? Math.min(gajian, jumlahHari) : null;

  const entriBulan = [...perTanggal.entries()].filter(([t]) => t.startsWith(bulan)).flatMap(([, e]) => e);
  const totalBulan = entriBulan.reduce((s, e) => s + e.cicilan.jumlah, 0);
  const tanggalJatuh = new Set(entriBulan.map((e) => e.cicilan.jatuhTempo)).size;
  const entriPilih = perTanggal.get(pilih) ?? [];
  const pilihGajian = gajianBulan && pilih === keIso(new Date(y, mo - 1, gajianBulan));

  const pindah = (k: number) => {
    const b = tambahBulan(`${bulan}-01`, k).slice(0, 7);
    setBulan(b);
    setPilih(b === hari.slice(0, 7) ? hari : `${b}-01`);
  };

  return (
    <Halaman judul="Jadwal" lebar="lebar" judulVisual={<h1 className="t-h1">Jadwal</h1>}>
      <NavJadwal aktif="kalender" />
      {data.pinjaman.length === 0 ? (
        <Kartu className="max-w-xl">
          <div className="flex items-start gap-3">
            <CalendarDays aria-hidden className="mt-0.5 size-6 shrink-0 text-teal" />
            <div>
              <h2 className="t-h2">Belum ada jatuh tempo</h2>
              <p className="mt-1 text-text2">Tambahkan pinjaman di Pinjamanku agar tanggal jatuh temponya muncul di kalender.</p>
            </div>
          </div>
        </Kartu>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <Kartu className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => pindah(-1)} aria-label="Bulan sebelumnya" className="grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
                <ChevronLeft aria-hidden className="size-6" />
              </button>
              <h2 className="t-h2" aria-live="polite">
                {BULAN_PANJANG[mo - 1]} {y}
              </h2>
              <button type="button" onClick={() => pindah(1)} aria-label="Bulan berikutnya" className="grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
                <ChevronRight aria-hidden className="size-6" />
              </button>
            </div>
            <div role="grid" aria-label={`Kalender ${BULAN_PANJANG[mo - 1]} ${y}`} className="mt-3">
              <div role="row" className="grid grid-cols-7 text-center">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => (
                  <span role="columnheader" key={h} className="py-2 text-sm font-semibold text-muted">
                    {h}
                  </span>
                ))}
              </div>
              {Array.from({ length: sel.length / 7 }, (_, r) => (
                <div role="row" key={r} className="grid grid-cols-7">
                  {sel.slice(r * 7, r * 7 + 7).map((t, i) => {
                    if (!t) return <span role="gridcell" key={i} />;
                    const e = perTanggal.get(t) ?? [];
                    const tgl = Number(t.slice(8));
                    const isGajian = gajianBulan === tgl;
                    const label = [
                      `${tgl} ${BULAN_PANJANG[mo - 1]}`,
                      t === hari && "hari ini",
                      e.length && `${e.length} cicilan, ${e.map((x) => LABEL_STATUS[x.status]).join(", ")}`,
                      isGajian && "tanggal gajian",
                    ]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <span role="gridcell" key={t} className="grid place-items-center p-0.5">
                        <button
                          type="button"
                          onClick={() => setPilih(t)}
                          aria-label={label}
                          aria-pressed={pilih === t}
                          className={cx(
                            "relative flex size-11 flex-col items-center justify-center rounded-xl text-[0.9375rem] font-semibold transition-colors sm:size-12",
                            pilih === t ? "bg-tint text-teal-d ring-2 ring-teal" : t === hari ? "text-ink ring-2 ring-line-strong" : "text-ink hover:bg-sunken",
                          )}
                        >
                          <span className="angka">{tgl}</span>
                          <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>
                            {e.slice(0, 3).map((x) => (
                              <span key={x.cicilan.id} className={cx("size-1.5 rounded-full", WARNA_TITIK[x.status])} />
                            ))}
                            {isGajian && <span className="size-1.5 rounded-full bg-muted" />}
                          </span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm text-text2" aria-label="Keterangan titik">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-amber-bar" /> Mendekati atau jatuh tempo
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-teal" /> Terjadwal
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-red" /> Terlambat
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-muted" /> Tanggal gajian
              </li>
            </ul>
          </Kartu>

          <div className="mt-5 space-y-4 lg:mt-0">
            <h2 className="t-h2">
              {HARI[dariIso(pilih).getDay()]}, {tglPendek(pilih)} {pilih.slice(0, 4)}
            </h2>
            {entriPilih.length === 0 && !pilihGajian && <p className="text-text2">Tidak ada jatuh tempo di tanggal ini.</p>}
            {pilihGajian && (
              <Kartu className="flex items-center gap-3 p-4 lg:p-4">
                <Wallet aria-hidden className="size-5 text-muted" />
                <span className="text-ink">Tanggal gajian (dari profil)</span>
              </Kartu>
            )}
            {entriPilih.map((e) => (
              <Kartu key={e.cicilan.id} className="p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">Cicilan {e.cicilan.ke}</p>
                    <p className="text-sm text-text2">{e.pinjaman.nama}</p>
                  </div>
                  <div className="text-right">
                    <p className="angka font-bold text-ink">{rupiah(e.cicilan.jumlah)}</p>
                    <LencanaStatus status={e.status} className="mt-1" />
                  </div>
                </div>
                {!sudahDibayar(e.status) && (
                  <Tombol kecil varian="kedua" className="mt-3" ikon={CalendarCheck} onClick={() => setTarget({ pinjamanId: e.pinjaman.id, info: e })}>
                    Tandai sudah bayar
                  </Tombol>
                )}
              </Kartu>
            ))}
            <Kartu varian="catatan" className="p-4 lg:p-5">
              <p className="text-ink">
                Total bulan ini <strong className="angka">{rupiah(totalBulan)}</strong> · {tanggalJatuh} tanggal jatuh tempo
              </p>
            </Kartu>
            <Tombol
              varian="kedua"
              blok
              ikon={Download}
              onClick={() => {
                unduhIcs(buatIcs(data.pinjaman, { privasi: data.pengingat.privasi, offsetsAlarm: data.pengingat.offsets }));
                toast("Berkas kalender diunduh. Buka untuk menambahkan ke aplikasi kalendermu.");
              }}
            >
              Ekspor ke kalender (.ics)
            </Tombol>
          </div>
        </div>
      )}
      <LembarCatatBayar target={target} onTutup={() => setTarget(null)} onSelesai={toast} />
    </Halaman>
  );
}
