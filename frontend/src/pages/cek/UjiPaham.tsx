/**
 * S14 Uji paham (UJP-01 s.d. UJP-03, PRD 6.7). Pengguna menyebut tiga angka; AI hanya membaca angka
 * dari tulisan bebas, kode menilai terhadap mesin dengan toleransi 2%. Tidak memblokir.
 */
import { CircleCheck, Info, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { IsianAngka, IsianTeks } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { Kartu, Pemberitahuan, Segmented, TagAI, Tombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { ApiError, bacaJawaban } from "@/lib/api";
import { persen, rupiah } from "@/lib/format";
import { BIDANG_UJI, TOLERANSI, jumlahTepat, nilai, type BidangUji } from "@/lib/ujiPaham";
import { useKonfig } from "@/state/config";
import { useAlur } from "@/state/flow";

const TANYA: Record<BidangUji, string> = {
  diterima: "Berapa uang yang kamu terima?",
  total: "Berapa total yang kamu bayar?",
  cicilan: "Berapa cicilan per bulan?",
};
const JUDUL: Record<BidangUji, string> = { diterima: "Uang diterima", total: "Total bayar", cicilan: "Cicilan per bulan" };

export default function UjiPaham() {
  const { utama, alur, ubah } = useAlur();
  const { aiTersedia } = useKonfig();
  const nav = useNavigate();
  const [cara, setCara] = useState<"tulis" | "angka">(aiTersedia ? "tulis" : "angka");
  const [teks, setTeks] = useState<Record<BidangUji, string>>({ diterima: "", total: "", cicilan: "" });
  const [angka, setAngka] = useState<Partial<Record<BidangUji, number | null>>>({});
  const [kutipan, setKutipan] = useState<Partial<Record<BidangUji, string>>>({});
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [tidakTerbaca, setTidakTerbaca] = useState<BidangUji[]>([]);
  const h = utama.hasil;
  if (!h) return <Navigate to="/cek" replace />;
  const modeTulis = cara === "tulis" && aiTersedia;
  const jawaban = alur.ujiPaham;
  const hasil = jawaban ? nilai(jawaban, h) : null;
  const tepat = hasil ? jumlahTepat(hasil) : 0;

  const simpan = (j: Partial<Record<BidangUji, number | null>>) => {
    ubah({ ujiPaham: j });
    catat("uji_paham_completed", { tepat: jumlahTepat(nilai(j, h)) });
  };

  const periksa = async () => {
    setGalat(null);
    if (!modeTulis) return simpan(angka);
    const isi = BIDANG_UJI.filter((b) => teks[b].trim());
    if (!isi.length) return setGalat("Tulis setidaknya satu angka.");
    setMemuat(true);
    try {
      const gabung = BIDANG_UJI.map((b) => `${JUDUL[b]}: ${teks[b].trim() || "-"}`).join("\n");
      const r = await bacaJawaban(gabung);
      const j: Partial<Record<BidangUji, number | null>> = {};
      const k: Partial<Record<BidangUji, string>> = {};
      for (const b of BIDANG_UJI) {
        const a = r.angka[b];
        j[b] = a?.nilai ?? null;
        if (a) k[b] = a.kutipan;
      }
      setKutipan(k);
      setTidakTerbaca(isi.filter((b) => j[b] == null));
      simpan(j);
    } catch (e) {
      setGalat(e instanceof ApiError ? `${e.message} Coba isi dengan angka saja.` : "Jawaban belum bisa dibaca. Coba isi dengan angka saja.");
    } finally {
      setMemuat(false);
    }
  };

  return (
    <Halaman
      judul="Uji paham"
      kembali="/cek/cicilan"
      langkah={{ ke: 3, dari: 4 }}
      aksi={
        <div className="space-y-1">
          {hasil ? (
            <Tombol blok onClick={() => nav("/cek/putuskan")}>
              Lanjut ke Putuskan
            </Tombol>
          ) : (
            <Tombol blok onClick={periksa} disabled={memuat}>
              {memuat ? "Membaca…" : "Cocokkan dengan mesin"}
            </Tombol>
          )}
          {hasil ? (
            <Tombol
              blok
              varian="teks"
              onClick={() => {
                ubah({ ujiPaham: null });
                setKutipan({});
              }}
            >
              Coba lagi
            </Tombol>
          ) : (
            <Tombol blok varian="teks" onClick={() => nav("/cek/putuskan")}>
              Lewati, langsung ke Putuskan
            </Tombol>
          )}
        </div>
      }
    >
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <div>
          <h2 className="t-h1 text-[22px] leading-[30px] lg:text-[26px] lg:leading-[34px]">Sebelum memutuskan, tulis dengan kata-katamu sendiri</h2>
          <p className="mt-1.5 text-text2">Bukan ujian. Ini cara memastikan angkanya sudah kamu lihat. Coba tanpa melihat layar sebelumnya.</p>
          {aiTersedia && !hasil && (
            <Segmented
              label="Cara menjawab"
              className="mt-5"
              nilai={cara}
              onNilai={setCara}
              pilihan={[
                {
                  nilai: "tulis",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Tulis bebas <Sparkles aria-hidden className="size-4" />
                    </span>
                  ),
                },
                { nilai: "angka", label: "Angka saja" },
              ]}
            />
          )}
          {!hasil && (
            <div className="mt-5 space-y-4">
              {BIDANG_UJI.map((b) =>
                modeTulis ? (
                  <IsianTeks key={b} label={TANYA[b]} name={b} nilai={teks[b]} onNilai={(v) => setTeks((t) => ({ ...t, [b]: v }))} placeholder={b === "diterima" ? "mis. sekitar 2,9 juta" : "Tulis dengan kata-katamu"} maxLength={120} />
                ) : (
                  <IsianAngka key={b} label={TANYA[b]} name={b} jenis="rupiah" nilai={angka[b] ?? null} onNilai={(n) => setAngka((a) => ({ ...a, [b]: n }))} />
                ),
              )}
              {modeTulis && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <TagAI /> AI hanya membaca angka dari tulisanmu. Kode yang menilai.
                </p>
              )}
              {memuat && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 aria-hidden className="size-4 animate-spin" /> Membaca jawaban…
                </p>
              )}
              {galat && <Pemberitahuan nada="red">{galat}</Pemberitahuan>}
            </div>
          )}
        </div>

        {hasil && (
          <section aria-labelledby="hasil-uji" className="mt-6 lg:mt-0">
            <h2 id="hasil-uji" className="label-kartu">
              Hasil · {modeTulis ? "angka dibaca AI, dinilai kode" : "dinilai kode"} (toleransi {persen(TOLERANSI * 100, 0)})
            </h2>
            <ul className="mt-3 space-y-3">
              {hasil.map((n) => (
                <li key={n.bidang}>
                  <Kartu varian={n.tepat ? "tint" : "perhatian"} as="div" className="p-4 lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-ink">{JUDUL[n.bidang]}</h3>
                      <span className={cx("inline-flex items-center gap-1.5 text-sm font-bold", n.tepat ? "text-teal-d" : "text-amber")}>
                        {n.tepat ? <CircleCheck aria-hidden className="size-4" /> : <TriangleAlert aria-hidden className="size-4" />}
                        {n.tepat ? "Dekat dengan mesin" : n.jawaban == null ? "Belum terbaca" : "Belum tepat"}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 text-[0.9375rem]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text2">Katamu</dt>
                        <dd className="text-right text-ink">{kutipan[n.bidang] ? `“${kutipan[n.bidang]}”` : n.jawaban != null ? rupiah(n.jawaban) : tidakTerbaca.includes(n.bidang) ? "tulisan tidak terbaca, coba tulis ulang" : "-"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text2">Mesin hitung</dt>
                        <dd className="angka font-bold text-ink">{rupiah(n.mesin)}</dd>
                      </div>
                    </dl>
                    {!n.tepat && (
                      <Link to={`/cek/penjelasan?tab=dari`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-teal">
                        <Info aria-hidden className="size-4" /> Lihat dari mana angkanya
                      </Link>
                    )}
                  </Kartu>
                </li>
              ))}
            </ul>
            <Kartu varian="catatan" className="mt-3 p-4 lg:p-5">
              <p className="text-ink">
                <strong>
                  {tepat} dari 3 angka {tepat === 3 ? "sudah dekat" : "sudah dekat"}.
                </strong>{" "}
                Kamu tetap bisa lanjut. Hasil ini tidak memblokir apa pun.
              </p>
            </Kartu>
          </section>
        )}
      </div>
    </Halaman>
  );
}
