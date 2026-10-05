/** S12 Semua cicilan (CEK-12, CEK-13): cicilan lain, uji tekanan, kontrafaktual penghasilan. */
import { Info, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { BilahRasio } from "@/components/Bilah";
import { IsianAngka, IsianTeks } from "@/components/Isian";
import { Lembar } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Kartu, KotakCentang, Lencana, TagAI, TautanTombol, Tombol } from "@/components/ui";
import { kontrafaktual, ujiTekanan } from "@/lib/engine";
import { persen, rupiah } from "@/lib/format";
import { useKonfig } from "@/state/config";
import { idBaru, useAlur } from "@/state/flow";

const SUMBER: Record<string, string> = { pinjamanku: "dari Pinjamanku", ai: "dicatat AI", manual: "diisi manual" };

function LembarTambah({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const { alur, ubah } = useAlur();
  const [nama, setNama] = useState("");
  const [per, setPer] = useState<number | null>(null);
  const [sisa, setSisa] = useState<number | null>(null);
  const [coba, setCoba] = useState(false);
  const galat = { per: !per || per <= 0 ? "Isi cicilan per bulan." : null, sisa: !sisa || sisa < 1 ? "Isi sisa bulan, minimal 1." : null };
  const simpan = () => {
    setCoba(true);
    if (galat.per || galat.sisa) return;
    ubah({ kewajiban: [...alur.kewajiban, { id: idBaru(), nama: nama.trim() || "Cicilan lain", cicilanPerBulan: per!, sisaBulan: sisa!, sumber: "manual" }] });
    setNama("");
    setPer(null);
    setSisa(null);
    setCoba(false);
    onTutup();
  };
  return (
    <Lembar buka={buka} onTutup={onTutup} judul="Tambah cicilan" kaki={<Tombol blok onClick={simpan}>Tambah</Tombol>}>
      <div className="space-y-4">
        <IsianTeks label="Nama" name="nama" nilai={nama} onNilai={setNama} placeholder="mis. Kredit motor…" maxLength={40} opsional />
        <IsianAngka label="Cicilan per bulan" name="per" jenis="rupiah" nilai={per} onNilai={setPer} galat={coba ? galat.per : null} />
        <IsianAngka label="Sisa" name="sisa" jenis="bulat" satuan="bulan" nilai={sisa} onNilai={setSisa} galat={coba ? galat.sisa : null} />
      </div>
    </Lembar>
  );
}

export default function SemuaCicilan() {
  const { alur, ubah, utama, cicilanLain } = useAlur();
  const { aiTersedia } = useKonfig();
  const nav = useNavigate();
  const [tambah, setTambah] = useState(false);
  const h = utama.hasil;
  if (!h) return <Navigate to="/cek" replace />;
  const total = h.cicilan + cicilanLain;
  const tekanan = ujiTekanan(alur.penghasilan, total);
  const kf = kontrafaktual({ ...utama.masukan, cicilanLain }, h);
  const totalDaftar = alur.kewajiban.reduce((s, k) => s + k.cicilanPerBulan, 0);

  return (
    <Halaman judul="Semua cicilan" kembali="/cek/hasil" aksi={<Tombol blok onClick={() => nav("/cek/uji-paham")}>Lanjut ke uji paham</Tombol>}>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          <Kartu aria-labelledby="lain">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="lain" className="t-h2">
                Cicilan lain yang berjalan
              </h2>
              <span className="angka shrink-0 font-bold text-ink">
                {rupiah(totalDaftar)}
                <span className="text-sm font-normal text-muted">/bln</span>
              </span>
            </div>
            {alur.kewajiban.length === 0 ? (
              <p className="mt-3 text-text2">Belum ada. Tambahkan cicilan lain yang sedang kamu bayar{aiTersedia ? ", atau ceritakan sambil mengobrol" : ""}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {alur.kewajiban.map((k) => (
                  <li key={k.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{k.nama}</p>
                      <p className="angka text-sm text-text2">
                        {rupiah(k.cicilanPerBulan)} per bulan · sisa {k.sisaBulan} bulan · {SUMBER[k.sumber]}
                      </p>
                      {k.dipakai === false && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Lencana nada="amber">Belum dipakai di hitungan</Lencana>
                          <Tombol kecil varian="kedua" onClick={() => ubah({ kewajiban: alur.kewajiban.map((x) => (x.id === k.id ? { ...x, dipakai: true } : x)) })}>
                            Pakai
                          </Tombol>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Hapus ${k.nama}`}
                      onClick={() => ubah({ kewajiban: alur.kewajiban.filter((x) => x.id !== k.id) })}
                      className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text2 hover:bg-red-soft hover:text-red"
                    >
                      <Trash2 aria-hidden className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Tombol varian="teks" ikon={Plus} className="-ml-3 mt-1" onClick={() => setTambah(true)}>
              Tambah cicilan
            </Tombol>
            <div className="mt-2 border-t border-line pt-2">
              <KotakCentang checked={alur.pakaiCicilanLain} onChange={(v) => ubah({ pakaiCicilanLain: v })}>
                Pakai total ini sebagai cicilan lain pada hitungan
              </KotakCentang>
            </div>
          </Kartu>

          {aiTersedia && (
            <Kartu varian="catatan">
              <div className="flex items-start justify-between gap-3">
                <h2 className="t-h2">Catat cicilan sambil mengobrol</h2>
                <TagAI />
              </div>
              <p className="mt-1.5 text-text2">Ceritakan cicilanmu dengan bahasa sehari-hari. AI mencatat, daftar selalu terlihat dan bisa kamu hapus.</p>
              <TautanTombol to="/cek/obrolan" varian="kedua" blok ikon={MessageCircle} className="mt-4">
                Mulai obrolan
              </TautanTombol>
            </Kartu>
          )}
        </div>

        <Kartu aria-labelledby="turun">
          <div className="flex items-start justify-between gap-3">
            <h2 id="turun" className="t-h2">
              Kalau penghasilan turun
            </h2>
            <Lencana nada="teal">Telusur</Lencana>
          </div>
          {tekanan.length === 0 ? (
            <p className="mt-3 text-text2">
              Uji tekanan perlu penghasilan.{" "}
              <Link to="/cek" className="tautan">
                Isi penghasilan
              </Link>
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-text2">
                Rasio seluruh cicilan ({rupiah(total)}) terhadap penghasilan. Garis hitam: patokan {persen(h.patokanPersen, 0)}.
              </p>
              <ul className="mt-4 space-y-3">
                {tekanan.map((t) => (
                  <li key={t.penurunanPersen} className="grid grid-cols-[5.5rem_1fr_3.75rem] items-center gap-3">
                    <span className="text-sm text-text2">{t.penurunanPersen === 0 ? "Sekarang" : `Turun ${t.penurunanPersen}%`}</span>
                    <BilahRasio nilai={t.rasioPersen} patokan={h.patokanPersen} skalaMaks={Math.max(60, Math.ceil(tekanan[4].rasioPersen / 10) * 10)} label={t.penurunanPersen === 0 ? "Penghasilan sekarang" : `Penghasilan turun ${t.penurunanPersen} persen`} />
                    <span className="angka text-right font-bold text-ink">{persen(t.rasioPersen)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-line pt-4">
                {kf.jenis === "ubah" ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-text2">Penghasilan paling rendah agar ≤ {persen(h.patokanPersen, 0)}</span>
                    <span className="angka shrink-0 text-lg font-bold text-ink">≈ {rupiah(kf.penghasilanMin)}</span>
                  </div>
                ) : kf.jenis === "ruang" ? (
                  <p className="text-text2">Saat ini masih dalam patokan. Lihat baris di atas untuk melihat pada penurunan berapa rasio melewati patokan.</p>
                ) : kf.jenis === "tidak_ada" ? (
                  <p className="text-text2">Cicilan lain saja sudah melewati patokan.</p>
                ) : null}
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <Info aria-hidden className="size-4" />
                  Kontrafaktual, dihitung mesin. Informasi, bukan saran.
                </p>
              </div>
            </>
          )}
        </Kartu>
      </div>
      <LembarTambah buka={tambah} onTutup={() => setTambah(false)} />
    </Halaman>
  );
}
