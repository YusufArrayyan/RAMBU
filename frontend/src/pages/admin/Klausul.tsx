/** A03 Konten klausul (ADM-03): tujuh kategori, status draf, ditinjau, terbit. */
import { Pencil } from "lucide-react";
import { useState } from "react";
import { IsianTeks } from "@/components/Isian";
import { Kartu, Pemberitahuan, Tombol, cx } from "@/components/ui";
import { panggilAdmin, type KlausulAdmin as K, type Saya } from "@/lib/admin";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";
import { LencanaAdmin, waktu } from "./Dasbor";

export default function KlausulAdmin({ saya }: { saya: Saya }) {
  const { data, galat, setData } = useMuat<K[]>("/api/admin/klausul");
  const [pilihId, setPilihId] = useState<number | null>(null);
  const [sunting, setSunting] = useState<K | null>(null);
  const [pesan, setPesan] = useState<{ nada: "teal" | "red"; teks: string } | null>(null);
  const bolehSunting = saya.izin.includes("sunting_klausul");
  const bolehTerbit = saya.izin.includes("terbitkan_klausul");
  const pilih = data?.find((k) => k.id === pilihId) ?? data?.[0] ?? null;

  const ganti = (k: K) => setData((data ?? []).map((x) => (x.id === k.id ? k : x)));

  const simpan = async () => {
    if (!sunting) return;
    try {
      const k = await panggilAdmin<K>(`/api/admin/klausul/${sunting.id}`, {
        method: "PUT",
        body: JSON.stringify({ judul: sunting.judul, penjelasan: sunting.penjelasan, rujukan: sunting.rujukan, contoh_kutipan: sunting.contoh_kutipan }),
      });
      ganti(k);
      setSunting(null);
      setPesan({ nada: "teal", teks: "Tersimpan sebagai draf. Ajukan untuk ditinjau agar bisa terbit." });
    } catch (e) {
      setPesan({ nada: "red", teks: (e as Error).message });
    }
  };

  const status = async (k: K, s: K["status"]) => {
    try {
      ganti(await panggilAdmin<K>(`/api/admin/klausul/${k.id}/status`, { method: "POST", body: JSON.stringify({ status: s }) }));
      setPesan({ nada: "teal", teks: s === "terbit" ? "Konten terbit dan dipakai di layar Klausul." : s === "ditinjau" ? "Diajukan ke peninjau." : "Dikembalikan ke draf." });
    } catch (e) {
      setPesan({ nada: "red", teks: (e as Error).message });
    }
  };

  return (
    <>
      <KepalaAdmin judul="Konten klausul" sub="Tujuh kategori. Teks penjelasan diterbitkan setelah ditinjau orang kedua." contoh={saya.data_contoh} />
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)] xl:items-start">
          <Kartu className="overflow-x-auto p-0 lg:p-0">
            <table className="w-full min-w-[36rem] text-[0.9375rem]">
              <caption className="sr-only">Kategori klausul. Pilih baris untuk melihat pratinjau.</caption>
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th scope="col" className="px-5 pt-4 pb-2 font-semibold">
                    Kategori
                  </th>
                  <th scope="col" className="px-3 pt-4 pb-2 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-3 pt-4 pb-2 font-semibold">
                    Catatan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((k) => (
                  <tr key={k.id} className={cx("hover:bg-sunken", pilih?.id === k.id && "bg-tint/60")}>
                    <th scope="row" className="px-5 py-3 text-left">
                      <button type="button" onClick={() => setPilihId(k.id)} aria-pressed={pilih?.id === k.id} className="min-h-11 text-left font-bold text-ink">
                        {k.judul}
                      </button>
                    </th>
                    <td className="px-3 py-3">
                      <LencanaAdmin status={k.status} />
                    </td>
                    <td className="px-3 py-3 text-sm text-text2">
                      {k.diubah_oleh} · {waktu(k.diubah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Kartu>

          {pilih && (
            <div className="space-y-4 xl:sticky xl:top-8">
              <Kartu aria-label={`Pratinjau ${pilih.judul}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="label-kartu">Pratinjau · {pilih.judul}</p>
                  {bolehSunting && !sunting && (
                    <Tombol varian="teks" kecil ikon={Pencil} onClick={() => setSunting({ ...pilih })}>
                      Sunting
                    </Tombol>
                  )}
                </div>
                {sunting ? (
                  <div className="mt-3 space-y-3">
                    <IsianTeks label="Judul" name="judul" nilai={sunting.judul} onNilai={(v) => setSunting({ ...sunting, judul: v })} maxLength={80} />
                    <div>
                      <label htmlFor="penjelasan" className="mb-1.5 block text-[0.9375rem] font-semibold text-ink">
                        Penjelasan RAMBU
                      </label>
                      <textarea id="penjelasan" rows={5} value={sunting.penjelasan} onChange={(e) => setSunting({ ...sunting, penjelasan: e.target.value })} className="isian min-h-32 py-3 text-base font-normal" />
                    </div>
                    <IsianTeks label="Rujukan" name="rujukan" nilai={sunting.rujukan} onNilai={(v) => setSunting({ ...sunting, rujukan: v })} maxLength={200} />
                    <IsianTeks label="Contoh kutipan (rekaan)" name="kutipan" nilai={sunting.contoh_kutipan} onNilai={(v) => setSunting({ ...sunting, contoh_kutipan: v })} maxLength={400} />
                    <div className="grid grid-cols-2 gap-2">
                      <Tombol varian="kedua" onClick={() => setSunting(null)}>
                        Batal
                      </Tombol>
                      <Tombol onClick={simpan}>Simpan draf</Tombol>
                    </div>
                  </div>
                ) : (
                  <>
                    <blockquote className="mt-3 rounded-xl border border-line bg-sunken px-4 py-3 text-ink italic">“{pilih.contoh_kutipan}”</blockquote>
                    <p className="mt-3 text-[1.0625rem] text-ink">
                      <strong>Penjelasan RAMBU.</strong> {pilih.penjelasan}
                    </p>
                    <p className="mt-2 text-sm text-text2">Rujukan: {pilih.rujukan || "belum ada"}</p>
                    <p className="mt-3 text-sm text-muted">Contoh kutipan rekaan. Daftar akhir tujuh kategori ditetapkan bersama penasihat hukum.</p>
                    <dl className="mt-3 flex justify-between gap-3 border-t border-line pt-3 text-sm">
                      <dt className="text-text2">Pemeriksa</dt>
                      <dd className="text-right text-ink">kutipan harus ada verbatim di teks</dd>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bolehSunting && pilih.status === "draf" && (
                        <Tombol kecil varian="kedua" onClick={() => status(pilih, "ditinjau")}>
                          Ajukan untuk ditinjau
                        </Tombol>
                      )}
                      {bolehTerbit && pilih.status === "ditinjau" && (
                        <Tombol kecil onClick={() => status(pilih, "terbit")}>
                          Terbitkan
                        </Tombol>
                      )}
                      {bolehSunting && pilih.status !== "draf" && (
                        <Tombol kecil varian="teks" onClick={() => status(pilih, "draf")}>
                          Kembalikan ke draf
                        </Tombol>
                      )}
                    </div>
                  </>
                )}
              </Kartu>
              {pesan && <Pemberitahuan nada={pesan.nada}>{pesan.teks}</Pemberitahuan>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
