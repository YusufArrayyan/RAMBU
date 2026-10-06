/** S08 Biaya sebenarnya (CEK-04 s.d. CEK-08, CEK-10, CEK-11, XAI-01). */
import { ChevronRight, CircleCheck, FileText, HelpCircle, Info, Phone, Scale, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { BilahRasio, LencanaPatokan } from "@/components/Bilah";
import { InfoTelusur } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Kartu, LabelPerkiraan, Lencana, Tombol, cx } from "@/components/ui";
import type { Hasil, Masukan } from "@/lib/engine";
import { kalimatBatas } from "@/lib/explain";
import { persen, rupiah, rupiahKata } from "@/lib/format";
import { kanalPengaduan, segmenUntuk, teksPatokan, versiAktif } from "@/lib/regulasi";
import { useAlur } from "@/state/flow";

function Baris({ label, nilai, kata, besaran, masukan, hasil, tambahan }: { label: string; nilai: string; kata?: string; besaran?: Parameters<typeof InfoTelusur>[0]["besaran"]; masukan: Masukan; hasil: Hasil; tambahan?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <dt className="text-text2">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        <span className="angka text-[1.0625rem] font-bold text-ink" aria-label={kata}>
          {nilai}
        </span>
        {tambahan && <span className="hidden text-sm text-muted sm:inline">{tambahan}</span>}
        {besaran ? <InfoTelusur besaran={besaran} masukan={masukan} hasil={hasil} label={label.toLowerCase()} /> : <span className="w-7" aria-hidden />}
      </dd>
    </div>
  );
}

export function LencanaBatas({ h }: { h: Hasil }) {
  const b = h.batas;
  const teks = b.tipe === "tunggal" ? persen(b.persen, 3) : `${persen(b.min, 1)}–${persen(b.maks, 1)}`;
  switch (h.statusBatas) {
    case "bawah_batas":
      return (
        <Lencana nada="teal" ikon={CircleCheck}>
          Di bawah batas {teks}, admin ikut dihitung
        </Lencana>
      );
    case "atas_batas":
      return (
        <Lencana nada="amber" ikon={TriangleAlert}>
          Di atas batas {teks}, admin ikut dihitung
        </Lencana>
      );
    case "bawah_keduanya":
      return (
        <Lencana nada="teal" ikon={CircleCheck}>
          Di bawah batas {teks} dengan dan tanpa admin
        </Lencana>
      );
    case "atas_jika_admin":
      return (
        <Lencana nada="amber" ikon={TriangleAlert}>
          Di atas batas {teks} jika admin dihitung
        </Lencana>
      );
    case "atas_bunga":
      return (
        <Lencana nada="amber" ikon={TriangleAlert}>
          Di atas batas {teks}, bahkan tanpa admin
        </Lencana>
      );
    case "belum_pasti":
      return (
        <Lencana nada="netral" ikon={HelpCircle}>
          Batas tenor lebih dari 6 bulan belum pasti ({teks})
        </Lencana>
      );
  }
}

export default function BiayaSebenarnya() {
  const { utama, alur, cicilanLain } = useAlur();
  const nav = useNavigate();
  const h = utama.hasil;
  if (!h) return <Navigate to="/cek" replace />;
  const m = utama.masukan;
  const reg = versiAktif();
  const segmen = segmenUntuk(reg, alur.segmen);

  const tautan = [
    h.rasioPersen !== null && cicilanLain > 0 && { ke: "/cek/penjelasan?tab=kenapa", Ikon: Info, teks: `Kenapa ${persen(h.rasioPersen)}, bukan ${persen(h.rasioSendiriPersen!)}?` },
    h.rasioPersen !== null && { ke: "/cek/penjelasan?tab=ubah", Ikon: SlidersHorizontal, teks: h.diAtasPatokan ? "Apa yang harus berubah?" : "Berapa ruang yang tersisa?" },
    { ke: "/cek/penjelasan?tab=dari", Ikon: HelpCircle, teks: "Dari mana angka-angka ini?" },
    { ke: "/cek/klausul", Ikon: FileText, teks: "Klausul yang perlu dibaca", hitung: alur.klausul.length },
    { ke: "/cek/bandingkan", Ikon: Scale, teks: "Bandingkan dengan penawaran lain" },
  ].filter(Boolean) as { ke: string; Ikon: typeof Info; teks: string; hitung?: number }[];

  return (
    <Halaman
      judul="Biaya sebenarnya"
      kembali="/cek"
      langkah={{ ke: 2, dari: 4 }}
      kanan={<LabelPerkiraan />}
      aksi={
        <Tombol blok onClick={() => nav("/cek/cicilan")}>
          Lanjut ke semua cicilan
        </Tombol>
      }
    >
      <h2 className="t-h1 max-w-[22ch] text-[28px] leading-[36px] lg:text-[34px] lg:leading-[42px]">
        Kamu menerima <span className="angka">{rupiah(h.diterima)}</span>, tapi membayar <span className="angka">{rupiah(h.total)}</span>
      </h2>
      <p className="sr-only">
        Kamu menerima {rupiahKata(h.diterima)}, tapi membayar {rupiahKata(h.total)}.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <Kartu className="px-5 py-1 lg:px-6 lg:py-1">
            <dl className="divide-y divide-line">
              <Baris label="Diterima" nilai={rupiah(h.diterima)} kata={rupiahKata(h.diterima)} besaran="diterima" masukan={m} hasil={h} />
              <Baris label="Total bayar" nilai={rupiah(h.total)} kata={rupiahKata(h.total)} besaran="total" masukan={m} hasil={h} />
              <Baris label="Biaya pinjaman" nilai={rupiah(h.biaya)} kata={rupiahKata(h.biaya)} tambahan={`${persen(h.biayaPersenPokok, 0)} dari pokok`} besaran="biaya" masukan={m} hasil={h} />
              <Baris label="Cicilan" nilai={`${h.jumlahCicilan} × ${rupiah(h.cicilan)}`} kata={`${h.jumlahCicilan} kali ${rupiahKata(h.cicilan)}`} besaran="cicilan" masukan={m} hasil={h} />
            </dl>
          </Kartu>

          <Kartu aria-labelledby="muat">
            <div className="flex items-start justify-between gap-3">
              <h3 id="muat" className="t-h2">
                Muat di penghasilanmu?
              </h3>
              {h.rasioPersen !== null && <InfoTelusur besaran="rasio" masukan={m} hasil={h} label="rasio" />}
            </div>
            {h.rasioPersen === null ? (
              <p className="mt-3 text-text2">
                Rasio <strong className="text-ink">tidak dapat dihitung</strong> karena penghasilan belum diisi. Bagian lain tetap bekerja.{" "}
                <Link to="/cek" className="tautan">
                  Isi penghasilan
                </Link>
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-text2">Cicilan ini saja</span>
                    <span className="angka text-lg font-bold text-ink">{persen(h.rasioSendiriPersen!)}</span>
                  </div>
                  <BilahRasio nilai={h.rasioSendiriPersen!} patokan={h.patokanPersen} label="Cicilan ini saja" />
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-text2">Bersama cicilan lain</span>
                    <span className="angka text-lg font-bold text-ink">{persen(h.rasioPersen)}</span>
                  </div>
                  <BilahRasio nilai={h.rasioPersen} patokan={h.patokanPersen} label="Bersama cicilan lain" />
                </div>
                <LencanaPatokan diAtas={!!h.diAtasPatokan} patokan={h.patokanPersen} />
                <p className="text-sm text-muted">{teksPatokan(reg)}</p>
              </div>
            )}
          </Kartu>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Kartu aria-labelledby="efektif">
            <div className="flex items-start justify-between gap-3">
              <h3 id="efektif" className="t-h2">
                Biaya efektif per hari
              </h3>
              <div className="flex items-center gap-2">
                <span className="angka text-lg font-bold text-ink">{persen(h.efektifHarianPersen, 3)}</span>
                <InfoTelusur besaran="efektif" masukan={m} hasil={h} label="biaya efektif per hari" />
              </div>
            </div>
            <dl className="mt-2 flex justify-between text-sm">
              <dt className="text-text2">Bunga saja</dt>
              <dd className="angka font-semibold text-ink">{persen(h.bungaHarianPersen, 3)} per hari</dd>
            </dl>
            <div className="mt-3">
              <LencanaBatas h={h} />
            </div>
            {h.diAtasBatasTotal && (
              <p className="mt-3 rounded-xl bg-amber-soft p-3 text-sm text-ink">
                Biaya pinjaman <span className="angka font-bold">{persen(h.biayaPersenPokok, 0)}</span> dari pokok, di atas batas total {persen(h.batasTotalPersen!, 0)} untuk seluruh biaya dan denda.
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              {kalimatBatas(h)} Jenis: {segmen.label.toLowerCase()}, tenor {m.tenor} hari. Sumber: {h.batas.baris.sumber}. RAMBU tidak menyatakan penyelenggara melanggar.
            </p>
          </Kartu>

          <Kartu className="p-1 lg:p-1">
            <ul className="divide-y divide-line">
              {tautan.map(({ ke, Ikon, teks, hitung }) => (
                <li key={ke}>
                  <Link to={ke} className="flex min-h-14 items-center gap-3 rounded-xl px-4 font-semibold text-ink hover:bg-sunken">
                    <Ikon aria-hidden className="size-5 shrink-0 text-teal" />
                    <span className="flex-1">{teks}</span>
                    {hitung !== undefined && hitung > 0 && <span className="angka grid size-7 place-items-center rounded-full bg-chip text-sm font-bold text-chip-ink">{hitung}</span>}
                    <ChevronRight aria-hidden className="size-5 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Kartu>

          <div className="space-y-2 px-1">
            <p className="text-sm leading-relaxed text-muted">
              Perkiraan dengan bunga flat harian atas pokok, admin dipotong dari pencairan, cicilan dibagi rata per bulan. Denda keterlambatan tidak dihitung. Penyelenggara yang memakai cara lain bisa
              menghasilkan angka berbeda. Versi parameter {h.versiParameter}.
            </p>
            <a
              href={kanalPengaduan.url}
              target="_blank"
              rel="noreferrer"
              className={cx("inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal hover:underline")}
            >
              <Phone aria-hidden className="size-4" />
              Ada yang janggal? {kanalPengaduan.nama} (telepon {kanalPengaduan.telepon})
            </a>
          </div>
        </div>
      </div>
    </Halaman>
  );
}
