/** S06 Isi penawaran (CEK-01 s.d. CEK-03) dengan tab Tempel dokumen (S07, AI opsional). */
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { BacaDokumen } from "@/components/BacaDokumen";
import { IsianAngka } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { Kartu, Pemberitahuan, Segmented, TagAI, Tombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { bersihkanDesimal, parseDesimal, persen, rupiah, tampilDesimal } from "@/lib/format";
import { useApp } from "@/state/app";
import { useKonfig } from "@/state/config";
import { keHarian, useAlur, type SatuanBunga } from "@/state/flow";

function IsianBunga({ nilai, satuan, onNilai, onSatuan, galat }: { nilai: number | null; satuan: SatuanBunga; onNilai: (n: number | null) => void; onSatuan: (s: SatuanBunga) => void; galat?: string | null }) {
  const id = useId();
  const [teks, setTeks] = useState(() => tampilDesimal(nilai));
  useEffect(() => {
    if (parseDesimal(teks) !== nilai) setTeks(tampilDesimal(nilai));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai]);
  const harian = keHarian(nilai, satuan);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.9375rem] font-semibold text-ink">
        Bunga
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          id={id}
          name="bunga"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,1"
          value={teks}
          onChange={(e) => {
            const b = bersihkanDesimal(e.target.value, 4);
            setTeks(b);
            onNilai(parseDesimal(b));
          }}
          aria-invalid={galat ? true : undefined}
          aria-describedby={`${id}-k`}
          className="isian"
        />
        <label className="sr-only" htmlFor={`${id}-s`}>
          Satuan bunga
        </label>
        <select id={`${id}-s`} value={satuan} onChange={(e) => onSatuan(e.target.value as SatuanBunga)} className="isian w-auto pr-3 text-base">
          <option value="hari">% per hari</option>
          <option value="bulan">% per bulan</option>
          <option value="tahun">% per tahun</option>
        </select>
      </div>
      <p id={`${id}-k`} className={cx("mt-1.5 text-sm", galat ? "font-medium text-red" : "text-muted")}>
        {galat ??
          (satuan !== "hari" && harian != null
            ? `Sama dengan ${persen(harian, 4)} per hari (dikonversi kode, 1 bulan = 30 hari, 1 tahun = 365 hari).`
            : "Kalau tertulis per bulan atau per tahun, ganti satuannya. Konversi dilakukan kode.")}
      </p>
    </div>
  );
}

export default function IsiPenawaran() {
  const { alur, ubah, ubahPenawaran, dihitung, pakaiContoh, isiDariApp, cicilanLain } = useAlur();
  const { data } = useApp();
  const { aiTersedia } = useKonfig();
  const nav = useNavigate();
  const [coba, setCoba] = useState(false);
  const [bukaData, setBukaData] = useState(true);
  const utama = dihitung[0];

  useEffect(() => {
    isiDariApp(data.profil.penghasilan, data.pinjaman);
  }, [isiDariApp, data.profil.penghasilan, data.pinjaman]);

  const jenis = alur.segmen === "produktif" ? "produktif" : "konsumtif";
  const galat = {
    pokok: !alur.pokok || alur.pokok <= 0 ? "Isi nilai pinjaman lebih dari nol." : null,
    tenor: !alur.tenor || alur.tenor < 1 ? "Isi tenor minimal 1 hari." : null,
    bunga: alur.bungaTertulis == null || alur.bungaTertulis < 0 ? "Isi bunga, boleh 0 bila tidak ada." : null,
    admin: utama.adminPersen == null ? "Isi biaya admin, boleh 0 bila tidak ada." : utama.adminPersen >= 100 ? "Biaya admin harus kurang dari 100%." : null,
  };
  const adaGalat = Object.values(galat).some(Boolean);

  const hitung = (e: FormEvent) => {
    e.preventDefault();
    setCoba(true);
    if (adaGalat || !utama.hasil) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    catat("offer_calculated", { input_method: alur.metodeIsi, segmen: alur.segmen });
    nav("/cek/hasil");
  };

  const setBunga = (n: number | null, s: SatuanBunga = alur.satuanBunga) => {
    ubah({ bungaTertulis: n, satuanBunga: s });
    ubahPenawaran(utama.id, { bungaHarianPersen: keHarian(n, s) });
  };

  return (
    <Halaman
      judul="Cek penawaran"
      kembali="/beranda"
      langkah={{ ke: 1, dari: 4 }}
      aksi={
        alur.metodeIsi === "tempel" && aiTersedia ? (
          <Tombol blok varian="kedua" onClick={() => ubah({ metodeIsi: "manual" })}>
            Periksa angka di Isi manual
          </Tombol>
        ) : (
          <Tombol type="submit" form="form-cek" blok>
            Hitung biaya sebenarnya
          </Tombol>
        )
      }
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start lg:gap-8">
        <div>
          {aiTersedia && (
            <Segmented
              label="Cara mengisi"
              className="mb-6"
              nilai={alur.metodeIsi}
              onNilai={(v) => ubah({ metodeIsi: v })}
              pilihan={[
                { nilai: "manual", label: "Isi manual" },
                {
                  nilai: "tempel",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Tempel dokumen <Sparkles aria-hidden className="size-4" />
                    </span>
                  ),
                },
              ]}
            />
          )}

          {alur.metodeIsi === "tempel" && aiTersedia ? (
            <section aria-label="Baca dokumen dengan AI">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="t-h2">Baca dokumen</h2>
                <TagAI />
              </div>
              <BacaDokumen
                onKlausul={(k, dibuang) => ubah({ klausul: k, klausulDibuang: dibuang })}
                onIsi={(a) => {
                  if (a.pokok) ubah({ pokok: Math.round(a.pokok) });
                  if (a.tenor) ubah({ tenor: Math.round(a.tenor) });
                  if (a.bunga != null) setBunga(a.bunga, "hari");
                  if (a.admin != null) ubahPenawaran(utama.id, { adminPersen: a.admin });
                  ubah({ metodeIsi: "manual" });
                }}
              />
            </section>
          ) : (
            <form id="form-cek" onSubmit={hitung} noValidate className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-[0.9375rem] font-semibold text-ink">Jenis pinjaman</legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["konsumtif", "Konsumtif"],
                      ["produktif", "Produktif (usaha)"],
                    ] as const
                  ).map(([j, label]) => (
                    <button
                      key={j}
                      type="button"
                      aria-pressed={jenis === j}
                      onClick={() => ubah({ segmen: j })}
                      className={cx(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] px-4 font-semibold transition-colors",
                        jenis === j ? "border-teal bg-tint text-teal-d" : "border-line-strong bg-surface text-ink hover:border-teal",
                      )}
                    >
                      {jenis === j && <Check aria-hidden className="size-4" strokeWidth={2.75} />}
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted">Menentukan batas biaya OJK yang dipakai pembanding. Pinjaman untuk keperluan pribadi termasuk konsumtif.</p>
              </fieldset>
              <IsianAngka label="Nilai pinjaman" name="pokok" jenis="rupiah" nilai={alur.pokok} onNilai={(n) => ubah({ pokok: n })} galat={coba ? galat.pokok : null} placeholder="3.000.000" />
              <IsianAngka label="Tenor" name="tenor" jenis="bulat" satuan="hari" nilai={alur.tenor} onNilai={(n) => ubah({ tenor: n })} galat={coba ? galat.tenor : null} placeholder="90" />
              <IsianBunga nilai={alur.bungaTertulis} satuan={alur.satuanBunga} onNilai={(n) => setBunga(n)} onSatuan={(s) => setBunga(alur.bungaTertulis, s)} galat={coba ? galat.bunga : null} />
              <IsianAngka
                label="Biaya admin"
                name="admin"
                jenis="desimal"
                satuan="% dari pinjaman"
                nilai={utama.adminPersen}
                onNilai={(n) => ubahPenawaran(utama.id, { adminPersen: n })}
                galat={coba ? galat.admin : null}
                placeholder="2"
                maxDesimal={2}
              />
              {coba && adaGalat && <Pemberitahuan nada="red">Ada kolom yang belum lengkap. Periksa pesan di bawah kolomnya.</Pemberitahuan>}
            </form>
          )}
        </div>

        <aside className="mt-6 space-y-4 lg:sticky lg:top-24 lg:mt-0">
          <Kartu className="p-0 lg:p-0">
            <button type="button" aria-expanded={bukaData} onClick={() => setBukaData((b) => !b)} className="flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left">
              <span className="t-h2">Data keuanganmu</span>
              <ChevronDown aria-hidden className={cx("size-5 text-text2 transition-transform", bukaData && "rotate-180")} />
            </button>
            {bukaData && (
              <div className="space-y-4 px-5 pb-5">
                <IsianAngka
                  label="Penghasilan per bulan"
                  name="penghasilan"
                  jenis="rupiah"
                  nilai={alur.penghasilan}
                  onNilai={(n) => ubah({ penghasilan: n })}
                  opsional
                  petunjuk={data.profil.penghasilan && alur.penghasilan === data.profil.penghasilan ? "Dari profil. Boleh diubah untuk hitungan ini." : "Kosong: rasio tidak dapat dihitung, bagian lain tetap bekerja."}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">Cicilan lain per bulan</p>
                    <p className="text-sm text-muted">
                      {alur.kewajiban.length ? `${alur.kewajiban.length} cicilan${alur.kewajiban.some((k) => k.sumber === "pinjamanku") ? ", dari Pinjamanku" : ""}` : "Belum ada"}
                    </p>
                  </div>
                  <span className="angka font-bold text-ink">{rupiah(cicilanLain)}</span>
                </div>
                <Link to="/cek/cicilan" className="inline-flex min-h-11 items-center font-semibold text-teal hover:underline">
                  Atur cicilan lain
                </Link>
              </div>
            )}
          </Kartu>
          <p className="text-sm text-muted">
            Hanya ingin mencoba?{" "}
            <button type="button" onClick={pakaiContoh} className="tautan">
              Pakai data contoh (Dina)
            </button>
          </p>
        </aside>
      </div>
    </Halaman>
  );
}
