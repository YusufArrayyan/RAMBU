/** A02 Parameter berversi (ADM-01, ADM-02, AC-17): nilai, sumber, status, aturan dua orang. */
import { Check, Circle, Plus } from "lucide-react";
import { useState } from "react";
import { IsianAngka, IsianTeks } from "@/components/Isian";
import { Lembar } from "@/components/Lembar";
import { Kartu, Pemberitahuan, Tombol, cx } from "@/components/ui";
import { panggilAdmin, type Saya, type VersiParameterAdmin } from "@/lib/admin";
import { angka, persen } from "@/lib/format";
import type { BarisBatasHarian, VersiRegulasi } from "@/lib/regulasi";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";
import { LencanaAdmin, waktu } from "./Dasbor";

interface Data {
  aktif: VersiRegulasi;
  versi: VersiParameterAdmin[];
  saya_id: number | null;
}

const LABEL_SEGMEN: Record<string, string> = { konsumtif: "Konsumtif", produktif: "Produktif", konsumtif_mikro: "Konsumtif mikro/ultramikro", konsumtif_kecil: "Konsumtif kecil/menengah", semua: "Semua segmen" };
const nilaiBaris = (b: BarisBatasHarian) => (b.persen !== undefined && b.persen !== null ? persen(b.persen, 3) : `${persen(b.persen_min ?? 0, 1)} – ${persen(b.persen_maks ?? 0, 1)}`);
const tenorBaris = (b: BarisBatasHarian) => `${b.tenor_maks_hari === null ? "> 6 bulan" : "≤ 6 bulan"}${b.pokok_maks != null ? `, pinjaman ≤ Rp${angka(b.pokok_maks)}` : ""}`;

function TabelParameter({ v }: { v: VersiRegulasi }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Tabel parameter versi ${v.id}`}>
      <table className="w-full min-w-[40rem] text-[0.9375rem]">
        <caption className="sr-only">Parameter versi {v.id}</caption>
        <thead>
          <tr className="text-left text-sm text-muted">
            {["Segmen", "Tenor", "Nilai", "Sumber", "Status"].map((h) => (
              <th key={h} scope="col" className="px-3 pb-2 font-semibold first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {v.batas_harian.map((b) => (
            <tr key={b.id}>
              <th scope="row" className="py-3 pr-3 text-left font-bold text-ink">
                {LABEL_SEGMEN[b.segmen] ?? b.segmen}
              </th>
              <td className="px-3 py-3 text-text2">{tenorBaris(b)}</td>
              <td className="angka px-3 py-3 font-bold text-ink">{nilaiBaris(b)}</td>
              <td className="px-3 py-3 text-text2">{b.sumber || "Tanpa sumber"}</td>
              <td className="px-3 py-3">
                <LencanaAdmin status={b.status} />
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-3 pr-3 text-left font-bold text-ink">
              Patokan rasio cicilan
            </th>
            <td className="px-3 py-3 text-text2">semua</td>
            <td className="angka px-3 py-3 font-bold text-ink">{persen(v.patokan_rasio.persen, 0)}</td>
            <td className="px-3 py-3 text-text2">{v.patokan_rasio.sumber}
              {v.patokan_rasio.cakupan_status === "terverifikasi" ? "; seluruh kreditur" : "; cakupan belum pasti"}
            </td>
            <td className="px-3 py-3">
              <LencanaAdmin status={v.patokan_rasio.status} />
            </td>
          </tr>
          {v.nonaktif?.map((n) => (
            <tr key={n.nama}>
              <th scope="row" className="py-3 pr-3 text-left font-bold text-ink">
                {n.nama}
              </th>
              <td className="px-3 py-3 text-text2">-</td>
              <td className="px-3 py-3 font-bold text-ink">Nonaktif</td>
              <td className="px-3 py-3 text-text2">{n.alasan}</td>
              <td className="px-3 py-3">
                <LencanaAdmin status="nonaktif" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Selisih sebelum dan sesudah untuk baris yang berubah. */
function Selisih({ lama, baru }: { lama: VersiRegulasi; baru: VersiRegulasi }) {
  const per = new Map(lama.batas_harian.map((b) => [b.id, b]));
  const baris = baru.batas_harian
    .map((b) => {
      const a = per.get(b.id);
      const sebelum = a ? `${nilaiBaris(a)} · ${a.status}` : "(kosong)";
      const sesudah = `${nilaiBaris(b)} · ${b.status}`;
      const sumberBeda = a && a.sumber !== b.sumber;
      return sebelum !== sesudah || sumberBeda ? { id: b.id, label: `${LABEL_SEGMEN[b.segmen] ?? b.segmen} ${tenorBaris(b)}`, sebelum, sesudah, sumber: sumberBeda ? b.sumber : null } : null;
    })
    .filter(Boolean) as { id: string; label: string; sebelum: string; sesudah: string; sumber: string | null }[];
  if (lama.patokan_rasio.persen !== baru.patokan_rasio.persen) baris.push({ id: "patokan", label: "Patokan rasio", sebelum: persen(lama.patokan_rasio.persen, 0), sesudah: persen(baru.patokan_rasio.persen, 0), sumber: null });
  if (!baris.length) return <p className="text-sm text-text2">Tidak ada perubahan nilai; hanya catatan atau tanggal berlaku.</p>;
  return (
    <ul className="space-y-2">
      {baris.map((b) => (
        <li key={b.id}>
          <p className="text-sm font-semibold text-ink">{b.label}</p>
          <div className="rumus mt-1 text-[13px]">
            <div>sebelum {b.sebelum}</div>
            <div className="font-bold">sesudah {b.sesudah}</div>
            {b.sumber && <div>sumber baru: {b.sumber}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function versiBerikut(id: string) {
  const [y, m] = [new Date().getFullYear(), new Date().getMonth() + 1];
  const dasar = `${y}.${m}`;
  const n = id.startsWith(dasar + ".") ? Number(id.split(".")[2]) + 1 : 1;
  return `${dasar}.${n}`;
}

function FormDraf({ aktif, buka, onTutup, onSelesai }: { aktif: VersiRegulasi; buka: boolean; onTutup: () => void; onSelesai: () => void }) {
  const [baris, setBaris] = useState(() => aktif.batas_harian.map((b) => ({ ...b })));
  const [patokan, setPatokan] = useState<number | null>(aktif.patokan_rasio.persen);
  const [versi, setVersi] = useState(() => versiBerikut(aktif.id));
  const [berlaku, setBerlaku] = useState(new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const ubah = (i: number, p: Partial<BarisBatasHarian>) => setBaris((bs) => bs.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const kirim = async (ajukan: boolean) => {
    setGalat(null);
    try {
      await panggilAdmin("/api/admin/parameter", {
        method: "POST",
        body: JSON.stringify({
          versi,
          berlaku_mulai: berlaku,
          batas_harian: baris.map((b) => ({ id: b.id, segmen: b.segmen, tenor_maks_hari: b.tenor_maks_hari, persen: b.persen ?? null, persen_min: b.persen_min ?? null, persen_maks: b.persen_maks ?? null, sumber: b.sumber, status: b.status === "nonaktif" ? "terverifikasi" : b.status })),
          patokan_persen: patokan,
          catatan,
          ajukan,
        }),
      });
      onSelesai();
      onTutup();
    } catch (e) {
      setGalat((e as Error).message);
    }
  };
  return (
    <Lembar
      buka={buka}
      onTutup={onTutup}
      judul="Draf parameter baru"
      kaki={
        <div className="grid grid-cols-2 gap-2">
          <Tombol varian="kedua" onClick={() => kirim(false)}>
            Simpan draf
          </Tombol>
          <Tombol onClick={() => kirim(true)}>Ajukan ke peninjau</Tombol>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <IsianTeks label="Nomor versi" name="versi" nilai={versi} onNilai={setVersi} />
          <IsianTeks label="Berlaku mulai" name="berlaku" type="date" nilai={berlaku} onNilai={setBerlaku} />
        </div>
        {baris.map((b, i) => (
          <fieldset key={b.id} className="rounded-2xl border border-line p-3">
            <legend className="px-1 text-sm font-bold text-ink">
              {LABEL_SEGMEN[b.segmen] ?? b.segmen} · {tenorBaris(b)}
            </legend>
            {b.persen !== undefined && b.persen !== null ? (
              <IsianAngka label="Batas per hari" name={`p-${b.id}`} jenis="desimal" satuan="%" maxDesimal={3} nilai={b.persen} onNilai={(n) => ubah(i, { persen: n ?? 0 })} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <IsianAngka label="Paling rendah" name={`min-${b.id}`} jenis="desimal" satuan="%" maxDesimal={3} nilai={b.persen_min ?? null} onNilai={(n) => ubah(i, { persen_min: n ?? 0 })} />
                <IsianAngka label="Paling tinggi" name={`maks-${b.id}`} jenis="desimal" satuan="%" maxDesimal={3} nilai={b.persen_maks ?? null} onNilai={(n) => ubah(i, { persen_maks: n ?? 0 })} />
              </div>
            )}
            <IsianTeks className="mt-3" label="Sumber" name={`s-${b.id}`} nilai={b.sumber} onNilai={(s) => ubah(i, { sumber: s })} petunjuk="Tanpa sumber, parameter otomatis nonaktif." />
          </fieldset>
        ))}
        <IsianAngka label="Patokan rasio cicilan" name="patokan" jenis="bulat" satuan="%" nilai={patokan} onNilai={setPatokan} />
        <IsianTeks label="Alasan perubahan" name="catatan" nilai={catatan} onNilai={setCatatan} maxLength={300} placeholder="mis. Pemetaan segmen tenor lebih dari 6 bulan…" />
        {galat && <Pemberitahuan nada="red">{galat}</Pemberitahuan>}
      </div>
    </Lembar>
  );
}

export default function Parameter({ saya }: { saya: Saya }) {
  const { data, galat, muat } = useMuat<Data>("/api/admin/parameter");
  const [draf, setDraf] = useState(false);
  const [aksiGalat, setAksiGalat] = useState<string | null>(null);
  const bolehAjukan = saya.izin.includes("ajukan_parameter");
  const bolehSetujui = saya.izin.includes("setujui_parameter");

  const putus = async (id: number, aksi: "setujui" | "tolak") => {
    setAksiGalat(null);
    try {
      await panggilAdmin(`/api/admin/parameter/${id}/${aksi}`, { method: "POST" });
      muat();
    } catch (e) {
      setAksiGalat((e as Error).message);
    }
  };

  return (
    <>
      <KepalaAdmin
        judul="Parameter berversi"
        sub={data ? `Versi aktif ${data.aktif.id}. Setiap nilai punya sumber dan status verifikasi.` : "Memuat versi aktif."}
        contoh={saya.data_contoh}
        aksi={
          bolehAjukan &&
          data && (
            <Tombol varian="kedua" kecil ikon={Plus} onClick={() => setDraf(true)}>
              Draf baru
            </Tombol>
          )
        }
      />
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] xl:items-start">
          <div className="space-y-6">
            <Kartu>
              <TabelParameter v={data.aktif} />
            </Kartu>
            <Kartu aria-labelledby="riwayat">
              <h2 id="riwayat" className="t-h2">
                Riwayat versi
              </h2>
              {data.versi.length === 0 ? (
                <p className="mt-2 text-text2">Belum ada versi dari panel. Versi aktif berasal dari berkas konfigurasi di repositori.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {data.versi.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div>
                        <p className="font-bold text-ink">
                          {v.versi} · {v.catatan}
                        </p>
                        <p className="text-sm text-muted">
                          Diajukan {v.pengaju ?? "-"} · {waktu(v.dibuat)}
                          {v.penyetuju && ` · diputus ${v.penyetuju}`}
                        </p>
                      </div>
                      <LencanaAdmin status={v.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Kartu>
          </div>

          <div className="space-y-4">
            {data.versi
              .filter((v) => v.status === "menunggu")
              .map((v) => {
                const milikSendiri = v.pengaju_id !== null && v.pengaju_id === data.saya_id;
                return (
                  <Kartu key={v.id} aria-label={`Perubahan menunggu ${v.versi}`}>
                    <h2 className="t-h2">Perubahan menunggu</h2>
                    <p className="mt-1 text-text2">
                      {v.versi}: {v.catatan}
                    </p>
                    <div className="mt-3">
                      <Selisih lama={data.aktif} baru={v.isi} />
                    </div>
                    <ol className="mt-4 space-y-2 border-t border-line pt-4">
                      <li className="flex items-start gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-teal text-on-teal">
                          <Check aria-hidden className="size-4" strokeWidth={3} />
                        </span>
                        <span className="text-ink">Diajukan {v.pengaju ?? "penyunting"}</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Circle aria-hidden className="size-6 shrink-0 text-line-strong" />
                        <span className="text-ink">Menunggu persetujuan peninjau (orang berbeda)</span>
                      </li>
                    </ol>
                    {bolehSetujui && (
                      <div className="mt-4 space-y-2">
                        <Tombol blok disabled={milikSendiri} onClick={() => putus(v.id, "setujui")}>
                          Setujui dan terbitkan
                        </Tombol>
                        <Tombol blok varian="teks" disabled={milikSendiri} onClick={() => putus(v.id, "tolak")}>
                          Tolak
                        </Tombol>
                      </div>
                    )}
                    <p className={cx("mt-3 text-sm", milikSendiri ? "font-semibold text-amber" : "text-muted")}>
                      Aturan dua orang: pengaju tidak bisa menyetujui perubahannya sendiri.{milikSendiri && " Ini usulanmu, jadi tombol persetujuan nonaktif."}
                    </p>
                  </Kartu>
                );
              })}
            {aksiGalat && <Pemberitahuan nada="red">{aksiGalat}</Pemberitahuan>}
            <Kartu varian="catatan" className="p-4">
              <p className="text-sm text-text2">Setiap versi tersimpan permanen. Hasil hitung pengguna mencatat versi parameter yang dipakai. Parameter tanpa sumber otomatis berstatus Nonaktif.</p>
            </Kartu>
          </div>
        </div>
      )}
      {data && draf && <FormDraf aktif={data.aktif} buka={draf} onTutup={() => setDraf(false)} onSelesai={muat} />}
    </>
  );
}
