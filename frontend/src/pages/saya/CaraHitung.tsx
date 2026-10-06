/** S26 Cara RAMBU menghitung (XAI-08): versi parameter, sumber, status verifikasi, rumus. */
import { CircleCheck } from "lucide-react";
import { BlokRumus } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Kartu, Lencana } from "@/components/ui";
import { persen } from "@/lib/format";
import { tglPanjang } from "@/lib/jadwal";
import { LABEL_STATUS, adminTermasuk, labelBaris, versiAktif, type StatusParameter } from "@/lib/regulasi";

function Status({ s }: { s: StatusParameter }) {
  const nada = s === "terverifikasi" ? "teal" : s === "nonaktif" ? "netral" : "amber";
  return <Lencana nada={nada}>{LABEL_STATUS[s]}</Lencana>;
}

export default function CaraHitung() {
  const reg = versiAktif();
  return (
    <Halaman judul="Cara RAMBU menghitung" kembali={true} lebar="lebar">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          <Kartu varian="tint">
            <div className="flex items-start justify-between gap-3">
              <h2 className="t-h2">Versi parameter {reg.id}</h2>
              <Lencana nada="teal" ikon={CircleCheck} className="bg-surface">
                Aktif
              </Lencana>
            </div>
            <p className="mt-1.5 text-teal-d">Semua angka dihitung rumus tetap. AI tidak menulis angka.</p>
            <p className="mt-2 text-sm text-teal-d">
              Diterbitkan {tglPanjang(reg.diterbitkan)} setelah ditinjau dua orang ({reg.pengaju} dan {reg.penyetuju}). Setiap hasil hitung mencatat versi yang dipakai.
            </p>
          </Kartu>

          <Kartu aria-labelledby="batas">
            <h2 id="batas" className="t-h2">
              Batas biaya harian (OJK)
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {reg.batas_harian.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-ink">{labelBaris(reg, b)}</p>
                    <p className="text-sm text-muted">{b.sumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="angka text-lg font-bold text-ink">
                      {b.persen != null ? persen(b.persen, 3) : `${persen(b.persen_min!, 1)}–${persen(b.persen_maks!, 1)}`}
                    </span>
                    <Status s={b.status} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded-xl bg-sunken p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{adminTermasuk(reg) ? "Admin termasuk dalam batas" : "Apakah batas harian termasuk admin?"}</p>
                <Status s={reg.admin_termasuk_batas.status} />
              </div>
              <p className="mt-1 text-sm text-text2">{reg.admin_termasuk_batas.catatan}</p>
            </div>
            {reg.batas_total && (
              <div className="mt-2 rounded-xl bg-sunken p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">Batas total {persen(reg.batas_total.persen, 0)} dari pinjaman</p>
                  <Status s={reg.batas_total.status} />
                </div>
                <p className="mt-1 text-sm text-text2">
                  {reg.batas_total.catatan} Sumber: {reg.batas_total.sumber}.
                </p>
              </div>
            )}
          </Kartu>

          <Kartu aria-labelledby="patokan">
            <div className="flex items-start justify-between gap-3">
              <h2 id="patokan" className="t-h2">
                Patokan cicilan {reg.patokan_rasio.persen}% penghasilan
              </h2>
              <Status s={reg.patokan_rasio.status} />
            </div>
            <p className="mt-1.5 text-text2">
              Mengacu pada {reg.patokan_rasio.sumber}. {reg.patokan_rasio.catatan}
            </p>
            <p className="mt-1.5 text-sm text-muted">Batas ini mengikat penyelenggara saat menilai pengajuan. RAMBU memakainya sebagai patokan untuk melihat beban seluruh cicilanmu.</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-text2">Cakupan:</span>
              <Status s={reg.patokan_rasio.cakupan_status} />
            </div>
          </Kartu>
        </div>

        <div className="space-y-4">
          <Kartu aria-labelledby="rumus">
            <h2 id="rumus" className="t-h2">
              Rumus
            </h2>
            <div className="mt-3">
              <BlokRumus
                rumus="P = pokok, T = tenor (hari), r = bunga per hari, a = admin, I = penghasilan, K = cicilan lain"
                langkah={[
                  "bunga = P × r × T",
                  "admin = P × a",
                  "diterima = P − admin",
                  "total = P + bunga",
                  "biaya = total − diterima",
                  "n = maks(1, pembulatan atas(T ÷ 30))",
                  "cicilan = total ÷ n",
                  "rasio = (cicilan + K) ÷ I",
                  "efektif = biaya ÷ (P × T)",
                  "rasio_d = (cicilan + K) ÷ (I × (1 − d))",
                ]}
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              Perkiraan dengan bunga flat harian atas pokok, admin dipotong dari pencairan, cicilan dibagi rata per bulan. Denda keterlambatan tidak dihitung. Pembulatan hanya saat tampil.
            </p>
          </Kartu>

          <Kartu aria-labelledby="xai">
            <h2 id="xai" className="t-h2">
              Tiga cara RAMBU menjelaskan
            </h2>
            <dl className="mt-2 space-y-3">
              <div>
                <dt className="font-semibold text-ink">Telusur</dt>
                <dd className="text-text2">Ikon ⓘ di setiap angka penting membuka rumus dengan angkamu, dari fungsi yang sama dengan angkanya.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Kontrastif</dt>
                <dd className="text-text2">Menjawab “kenapa ini, bukan itu”, misalnya selisih rasio dari cicilan lain, atau selisih biaya dua penawaran.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Kontrafaktual</dt>
                <dd className="text-text2">Menjawab “apa yang harus berubah”, satu variabel pada satu waktu, dibulatkan ke arah aman. Informasi, bukan saran.</dd>
              </div>
            </dl>
          </Kartu>

          <Kartu aria-labelledby="nonaktif">
            <h2 id="nonaktif" className="t-h2">
              Tidak dipakai
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {reg.nonaktif.map((n) => (
                <li key={n.nama} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-ink">{n.nama}</p>
                    <p className="text-sm text-muted">{n.alasan}</p>
                  </div>
                  <Status s="nonaktif" />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Parameter tanpa sumber tidak pernah tampil sebagai batas.</p>
          </Kartu>
        </div>
      </div>
    </Halaman>
  );
}
