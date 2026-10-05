/** S09 Penjelasan hasil: Dari mana? (telusur), Kenapa? (kontrastif), Apa berubah? (kontrafaktual). PRD 6.3–6.5. */
import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router";
import { BlokRumus } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Kartu, Lencana, Segmented, TautanTombol } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { kontrafaktual, kontrastifRasio, type Hasil, type Masukan } from "@/lib/engine";
import { angka, persen, rupiah } from "@/lib/format";
import { telusur, type Besaran } from "@/lib/telusur";
import { useAlur } from "@/state/flow";

type Tab = "dari" | "kenapa" | "ubah";
const URUTAN: Besaran[] = ["diterima", "total", "biaya", "cicilan", "rasio", "efektif"];

function DariMana({ m, h }: { m: Masukan; h: Hasil }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {URUTAN.map((b) => {
        const t = telusur(b, m, h);
        if (!t) return null;
        return (
          <Kartu key={b} as="article">
            <div className="flex items-start justify-between gap-3">
              <h3 className="t-h2">{t.judul}</h3>
              <Lencana nada="teal">Telusur</Lencana>
            </div>
            <div className="mt-3">
              <BlokRumus rumus={t.rumus} langkah={t.langkah} />
            </div>
            <p className="mt-3 text-sm text-muted">{t.keterangan}</p>
          </Kartu>
        );
      })}
    </div>
  );
}

function Kenapa({ m, h }: { m: Masukan; h: Hasil }) {
  const k = kontrastifRasio(h, m.penghasilan, m.cicilanLain);
  useEffect(() => {
    if (k) catat("kontrastif_viewed", {}, true);
  }, [k]);
  if (!k) return <Kartu>Rasio tidak dapat dihitung karena penghasilan belum diisi, jadi tidak ada perbandingan rasio.</Kartu>;
  return (
    <Kartu varian="tint" className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h3 className="t-h2">
          Kenapa {persen(k.rasioPersen)}, bukan {persen(k.rasioSendiriPersen)}?
        </h3>
        <span className="shrink-0 text-sm font-bold text-teal-d">Kontrastif</span>
      </div>
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt className="text-teal-d">Tanpa cicilan lain</dt>
          <dd className="angka text-lg font-bold text-ink">{persen(k.rasioSendiriPersen)}</dd>
        </div>
        <div className="flex justify-between border-b border-tint-line pb-3">
          <dt className="text-teal-d">Dengan cicilan lain</dt>
          <dd className="angka text-lg font-bold text-ink">{persen(k.rasioPersen)}</dd>
        </div>
      </dl>
      {k.cicilanLain > 0 ? (
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink">
          Selisih <strong>{angka(k.selisihPoin, 1)} poin persentase</strong> berasal dari cicilan lain {rupiah(k.cicilanLain)} per bulan ({rupiah(k.cicilanLain)} ÷ {rupiah(k.penghasilan)}).
        </p>
      ) : (
        <p className="mt-3 text-ink">Tidak ada cicilan lain yang dicatat, jadi kedua rasio sama.</p>
      )}
      <div className="mt-4">
        <BlokRumus rumus="rasio total = (cicilan ÷ I) + (K ÷ I)" langkah={[`= ${persen(k.rasioSendiriPersen, 2)} + ${persen(k.selisihPoin, 2)}`, `= ${persen(k.rasioPersen, 2)}`]} />
      </div>
    </Kartu>
  );
}

function ApaBerubah({ m, h }: { m: Masukan; h: Hasil }) {
  const k = kontrafaktual(m, h);
  useEffect(() => {
    if (k.jenis === "ubah") catat("kontrafaktual_viewed", { variabel: "pokok" }, true);
    if (k.jenis === "ruang") catat("kontrafaktual_viewed", { variabel: "ruang" }, true);
  }, [k.jenis]);
  const patokan = persen(h.patokanPersen, 0);
  return (
    <Kartu varian="tint" className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h3 className="t-h2">{k.jenis === "ruang" ? "Berapa ruang yang tersisa?" : "Apa yang harus berubah?"}</h3>
        <span className="shrink-0 text-sm font-bold text-teal-d">Kontrafaktual</span>
      </div>
      {k.jenis === "tanpa_penghasilan" && <p className="mt-3 text-ink">Penghasilan belum diisi, jadi rasio dan perubahan yang diperlukan tidak dapat dihitung.</p>}
      {k.jenis === "tidak_ada" && <p className="mt-3 text-ink">Tidak ada nilai pinjaman yang memenuhi patokan {patokan} dengan cicilan lain saat ini.</p>}
      {k.jenis === "ruang" && (
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink">
          Rasio {persen(k.rasioPersen)} sudah dalam patokan {patokan}. Ruang yang tersisa sampai patokan sekitar <strong className="angka">{rupiah(Math.floor(k.ruangCicilan))}</strong> cicilan per bulan.
        </p>
      )}
      {k.jenis === "ubah" && (
        <>
          <p className="mt-2 text-teal-d">Agar rasio tidak melewati {patokan}. Satu perubahan sekali, syarat lain tetap.</p>
          <dl className="mt-4 divide-y divide-tint-line">
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-teal-d">Pokok pinjaman paling tinggi</dt>
              <dd className="angka text-lg font-bold text-ink">≈ {rupiah(k.pokokMaks)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-teal-d">Cicilan lain paling tinggi</dt>
              <dd className="angka text-lg font-bold text-ink">{k.cicilanLainMaks === null ? "tidak ada ruang" : rupiah(k.cicilanLainMaks)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-teal-d">Penghasilan paling rendah</dt>
              <dd className="angka text-lg font-bold text-ink">≈ {rupiah(k.penghasilanMin)}</dd>
            </div>
          </dl>
          {k.cicilanLainMaks === null && <p className="mt-2 text-sm text-teal-d">Cicilan pinjaman ini saja sudah melewati patokan, jadi mengurangi cicilan lain tidak cukup.</p>}
          <details className="mt-3">
            <summary className="min-h-11 py-2 font-semibold text-teal-d">Lihat rumusnya</summary>
            <BlokRumus
              rumus="P_max = (L·I − K)·n ÷ (1 + r·T); K_max = L·I − cicilan; I_min = (cicilan + K) ÷ L"
              langkah={[`P_max = ${rupiah(k.pokokMaksMentah)} → dibulatkan ke bawah ${rupiah(k.pokokMaks)}`, `I_min = ${rupiah(k.penghasilanMinMentah)} → dibulatkan ke atas ${rupiah(k.penghasilanMin)}`]}
            />
            <p className="mt-2 text-sm text-teal-d">Dibulatkan ke arah aman: pokok ke bawah, penghasilan ke atas. Tidak ada kontrafaktual tenor karena jumlah cicilan dibulatkan ke atas.</p>
          </details>
        </>
      )}
      <p className="mt-4 text-sm font-medium text-teal-d">Ini informasi, bukan saran. RAMBU tidak menyuruh mengubah atau mengambil pinjaman.</p>
    </Kartu>
  );
}

export default function Penjelasan() {
  const { utama } = useAlur();
  const [cari, setCari] = useSearchParams();
  const tab = (["dari", "kenapa", "ubah"].includes(cari.get("tab") ?? "") ? cari.get("tab") : "dari") as Tab;
  if (!utama.hasil) return <Navigate to="/cek" replace />;
  const m = utama.masukan;
  const h = utama.hasil;
  return (
    <Halaman judul="Penjelasan hasil" kembali="/cek/hasil" lebar="lebar" aksi={<TautanTombol to="/cek/hasil" blok varian="kedua">Kembali ke hasil</TautanTombol>}>
      <Segmented
        label="Jenis penjelasan"
        className="mb-6 max-w-xl"
        nilai={tab}
        onNilai={(v) => setCari({ tab: v }, { replace: true })}
        pilihan={[
          { nilai: "dari", label: "Dari mana?" },
          { nilai: "kenapa", label: "Kenapa?" },
          { nilai: "ubah", label: "Apa berubah?" },
        ]}
      />
      <div role="tabpanel" aria-live="polite">
        {tab === "dari" && <DariMana m={m} h={h} />}
        {tab === "kenapa" && <Kenapa m={m} h={h} />}
        {tab === "ubah" && <ApaBerubah m={m} h={h} />}
      </div>
      <p className="mt-6 text-sm text-muted">Semua angka dihitung mesin hitung yang sama, bukan ditulis AI. Versi parameter {h.versiParameter}.</p>
    </Halaman>
  );
}
