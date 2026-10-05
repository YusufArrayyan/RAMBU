/** M01 Laporan agregat mitra (MIT-01, MIT-02): hanya agregat anonim, k ≥ 20, tanpa data per orang. */
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { GrafikBatang, formatPersen1 } from "@/components/Bilah";
import { Kartu, Lencana, Segmented, cx } from "@/components/ui";
import type { LaporanMitra as L } from "@/lib/admin";
import { angka, persen } from "@/lib/format";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";

const SEMBUNYI = "Disembunyikan";

function Angka({ label, nilai, sub, nada }: { label: string; nilai: string | null; sub: string; nada?: "amber" }) {
  return (
    <Kartu as="div">
      <p className="label-kartu">{label}</p>
      <p className={cx("angka mt-1 text-[34px] leading-[40px] font-extrabold", nilai === null ? "text-muted" : nada === "amber" ? "text-amber" : "text-ink")}>{nilai ?? SEMBUNYI}</p>
      <p className="text-sm text-text2">{nilai === null ? "Kurang dari 20 pengguna" : sub}</p>
    </Kartu>
  );
}

export default function LaporanMitra() {
  const [hari, setHari] = useState<"30" | "90" | "365">("90");
  const [lihatContoh, setLihatContoh] = useState(false);
  const { data, galat } = useMuat<L>(`/api/mitra/laporan?hari=${hari}`);
  const c = lihatContoh ? data?.contoh : null;
  const sebaran = c ? c.sebaran_rasio : data?.sebaran_rasio;

  return (
    <>
      <KepalaAdmin
        judul="Laporan agregat mitra"
        sub="Untuk OJK, peneliti, dan mitra literasi keuangan (F5)."
        contoh={!!c}
        aksi={
          <Segmented
            label="Periode"
            className="w-72"
            nilai={hari}
            onNilai={setHari}
            pilihan={[
              { nilai: "30", label: "30 hari" },
              { nilai: "90", label: "90 hari" },
              { nilai: "365", label: "1 tahun" },
            ]}
          />
        }
      />
      <div className="kartu-tint mb-5 flex items-start gap-3 px-4 py-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
        <p className="text-teal-d">Hanya agregat anonim. Kelompok dengan kurang dari {data?.k_minimum ?? 20} pengguna tidak ditampilkan (k-anonimitas). Tidak ada data atau ekspor per orang.</p>
      </div>
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <div className="space-y-6">
          {data.contoh && (
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm font-semibold text-text2">
              <input type="checkbox" checked={lihatContoh} onChange={(e) => setLihatContoh(e.target.checked)} className="size-5 accent-[var(--teal)]" />
              Tampilkan data contoh dari mockup PRD (pengembangan saja)
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Angka label="Pengguna aktif" nilai={c ? angka(c.pengguna_aktif) : data.pengguna_aktif === null ? null : angka(data.pengguna_aktif)} sub={c ? `kelompok ${c.periode}` : `${hari} hari terakhir`} />
            <Angka
              label="Selesai uji paham"
              nilai={c ? persen(c.uji_paham_selesai_persen, 0) : data.uji_paham_selesai_persen === null ? null : persen(data.uji_paham_selesai_persen, 0)}
              sub="dari yang mengecek penawaran"
            />
            <Angka
              label="Rasio di atas patokan"
              nilai={c ? persen(c.di_atas_patokan_persen, 0) : data.di_atas_patokan_persen === null ? null : persen(data.di_atas_patokan_persen, 0)}
              sub="dari pengguna akun dengan pinjaman aktif"
              nada="amber"
            />
          </div>
          <Kartu aria-labelledby="sebaran">
            <div className="flex items-start justify-between gap-3">
              <h2 id="sebaran" className="t-h2">
                Sebaran rasio cicilan terhadap penghasilan
              </h2>
              <Lencana>Agregat</Lencana>
            </div>
            {sebaran ? (
              <>
                <div className="mt-8">
                  <GrafikBatang
                    label="Persentase pengguna per rentang rasio"
                    format={formatPersen1}
                    tinggi={200}
                    data={sebaran.map((s, i) => ({ label: s.rentang, nilai: s.persen ?? 0, nada: i >= 3 ? "amber" : "teal" }))}
                  />
                </div>
                <p className="mt-4 text-sm text-text2">Persentase pengguna per rentang. Kuning: di atas patokan 30%. Rentang dengan kurang dari 20 pengguna ditampilkan 0 dan disembunyikan.</p>
              </>
            ) : (
              <p className="mt-3 text-text2">Belum ada cukup pengguna akun dengan pinjaman aktif (minimal {data.k_minimum}) untuk ditampilkan tanpa risiko mengenali seseorang.</p>
            )}
          </Kartu>
          {!c && (
            <Kartu aria-labelledby="perilaku">
              <h2 id="perilaku" className="t-h2">
                Uji paham dan keputusan
              </h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {(["0", "1", "2", "3"] as const).map((k) => (
                  <div key={k} className="flex justify-between border-b border-line py-2">
                    <dt className="text-text2">{k} dari 3 angka tepat</dt>
                    <dd className="angka font-semibold text-ink">{data.sebaran_uji_paham[k] ?? SEMBUNYI}</dd>
                  </div>
                ))}
                {(["ambil", "tidak_jadi", "ubah"] as const).map((k) => (
                  <div key={k} className="flex justify-between border-b border-line py-2">
                    <dt className="text-text2">Keputusan: {k === "ambil" ? "ambil" : k === "tidak_jadi" ? "tidak jadi" : "ubah angka"}</dt>
                    <dd className="angka font-semibold text-ink">{data.keputusan?.[k] ?? SEMBUNYI}</dd>
                  </div>
                ))}
              </dl>
            </Kartu>
          )}
          <p className="text-sm text-muted">{data.catatan} Kerja sama mitra memerlukan perjanjian tertulis dan tinjauan hukum.</p>
        </div>
      )}
    </>
  );
}
