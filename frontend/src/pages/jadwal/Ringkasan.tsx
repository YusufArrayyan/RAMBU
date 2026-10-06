/** S21 Ringkasan bulanan (JDW-02, XAI-06): rasio enam bulan ke depan, kontrastif dan kontrafaktual. */
import { useMemo } from "react";
import { Link } from "react-router";
import { GrafikBatang, formatPersen1 } from "@/components/Bilah";
import { Halaman } from "@/components/Shell";
import { Kartu, Lencana } from "@/components/ui";
import { angka, persen, rupiah } from "@/lib/format";
import { BULAN_PANJANG, hariIni, kontrastifBulan, ringkasanBeberapaBulan } from "@/lib/jadwal";
import { teksPatokan, versiAktif } from "@/lib/regulasi";
import { useApp } from "@/state/app";
import { NavJadwal } from "./Kalender";

const namaBulan = (kunci: string) => BULAN_PANJANG[Number(kunci.slice(5)) - 1];

export default function Ringkasan() {
  const { data } = useApp();
  const I = data.profil.penghasilan;
  const L = versiAktif().patokan_rasio.persen;
  const bulan = useMemo(() => ringkasanBeberapaBulan(data.pinjaman, hariIni(), 6, I), [data.pinjaman, I]);

  // Kontrastif: perubahan rasio terbesar antara dua bulan berurutan
  let kontras: { dari: (typeof bulan)[number]; ke: (typeof bulan)[number]; k: ReturnType<typeof kontrastifBulan> } | null = null;
  for (let i = 1; i < bulan.length; i++) {
    const k = kontrastifBulan(bulan[i - 1], bulan[i], I);
    if (Math.abs(k.selisih) > 0.5 && (!kontras || Math.abs(k.selisih) > Math.abs(kontras.k.selisih))) kontras = { dari: bulan[i - 1], ke: bulan[i], k };
  }
  const atas = bulan.find((b) => b.rasioPersen !== null && b.rasioPersen > L);
  const iMin = atas ? Math.ceil((atas.total * 100) / L / 1000) * 1000 : null;

  return (
    <Halaman judul="Ringkasan bulanan" lebar="lebar" judulVisual={<h1 className="t-h1">Jadwal</h1>}>
      <NavJadwal aktif="ringkasan" />
      {!I ? (
        <Kartu className="max-w-xl">
          <h2 className="t-h2">Rasio tidak dapat dihitung</h2>
          <p className="mt-1 text-text2">Ringkasan membandingkan cicilan dengan penghasilan. Isi penghasilan di profil untuk melihatnya.</p>
          <Link to="/saya/profil" className="mt-3 inline-flex min-h-11 items-center font-semibold text-teal">
            Isi penghasilan
          </Link>
        </Kartu>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <Kartu aria-labelledby="grafik">
            <div className="flex items-start justify-between gap-3">
              <h2 id="grafik" className="t-h2">
                Cicilan terhadap penghasilan
              </h2>
              <Lencana nada="teal">Telusur</Lencana>
            </div>
            <div className="mt-8">
              <GrafikBatang
                label="Rasio cicilan terhadap penghasilan per bulan"
                format={formatPersen1}
                garis={{ nilai: L, label: `patokan ${L}%` }}
                data={bulan.map((b) => ({ label: b.label.split(" ")[0], nilai: b.rasioPersen ?? 0, nada: (b.rasioPersen ?? 0) > L ? "amber" : "teal" }))}
                tinggi={190}
              />
            </div>
            <p className="mt-4 text-sm text-text2">
              Berdasarkan jadwal di Pinjamanku dan penghasilan {rupiah(I)}. Warna kuning: di atas patokan.
            </p>
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Rincian per bulan</caption>
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-1.5 font-semibold">
                    Bulan
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Total cicilan
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Rasio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bulan.map((b) => (
                  <tr key={b.kunci}>
                    <th scope="row" className="py-2 text-left font-medium text-ink">
                      {b.label}
                    </th>
                    <td className="angka py-2 text-right text-ink">{rupiah(b.total)}</td>
                    <td className="angka py-2 text-right font-semibold text-ink">{persen(b.rasioPersen ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Kartu>

          <div className="space-y-4">
            {kontras && (
              <Kartu varian="tint">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="t-h2">
                    Kenapa {namaBulan(kontras.ke.kunci)} {kontras.k.selisih < 0 ? "turun" : "naik"} ke {persen(kontras.ke.rasioPersen ?? 0)}?
                  </h2>
                  <span className="shrink-0 text-sm font-bold text-teal-d">Kontrastif</span>
                </div>
                <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">
                  {kontras.k.selesai.length > 0 && `${kontras.k.selesai.map((p) => p.nama).join(", ")} selesai ${namaBulan(kontras.dari.kunci)}. `}
                  {kontras.k.mulai.length > 0 && `${kontras.k.mulai.map((p) => p.nama).join(", ")} mulai ${namaBulan(kontras.ke.kunci)}. `}
                  {kontras.ke.total > 0 ? `Tersisa ${rupiah(kontras.ke.total)} ÷ ${rupiah(I)} = ${persen(kontras.ke.rasioPersen ?? 0)}.` : "Tidak ada cicilan tersisa di bulan itu."}
                </p>
                {kontras.k.selesai.length === 0 && kontras.k.mulai.length === 0 && (
                  <p className="mt-1 text-teal-d">
                    Selisih {angka(Math.abs(kontras.k.selisihPoin ?? 0), 1)} poin persentase berasal dari perubahan jumlah cicilan ({rupiah(Math.abs(kontras.k.selisih))}).
                  </p>
                )}
              </Kartu>
            )}
            {atas && iMin && (
              <Kartu varian="tint">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="t-h2">Apa yang harus berubah?</h2>
                  <span className="shrink-0 text-sm font-bold text-teal-d">Kontrafaktual</span>
                </div>
                <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">
                  Agar {namaBulan(atas.kunci)} tidak melewati {L}%, penghasilan paling rendah <strong className="angka">≈ {rupiah(iMin)}</strong> dengan cicilan yang sama.
                </p>
                <p className="mt-2 text-sm text-teal-d">Informasi, bukan saran. Satu perubahan, syarat lain tetap.</p>
              </Kartu>
            )}
            {!atas && data.pinjaman.length > 0 && (
              <Kartu>
                <p className="text-ink">Enam bulan ke depan semua bulan berada dalam patokan {L}%.</p>
              </Kartu>
            )}
            <p className="text-sm text-muted">{teksPatokan(versiAktif())}</p>
          </div>
        </div>
      )}
    </Halaman>
  );
}
