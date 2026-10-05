/**
 * S13 Obrolan cicilan (CIC-01 s.d. CIC-04). Model mencatat lewat alat catat_kewajiban dan menghitung
 * lewat alat hitung (mesin yang sama). Kartu "Dicatat oleh alat" dan "Hasil mesin hitung" tampil
 * berdampingan dengan ucapan AI. Percakapan tidak disimpan RAMBU.
 */
import { Calculator, Check, CircleX, Loader2, SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Lembar } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Pemberitahuan, TagAI, Tombol } from "@/components/ui";
import { ApiError, wawancara, type HasilAlat, type KewajibanApi } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { menyiratkanMenyakitiDiri } from "@/lib/keselamatan";
import { useKonfig } from "@/state/config";
import { useAlur, type Kewajiban } from "@/state/flow";

interface Pesan {
  peran: "pengguna" | "asisten";
  teks: string;
  lokal?: boolean;
  ditolak?: string[];
  alat?: HasilAlat[];
}

const SAMBUTAN: Pesan = {
  peran: "asisten",
  lokal: true,
  teks: "Hai! Aku bantu mencatat cicilanmu. Selain pinjaman ini, ada cicilan lain yang sedang berjalan? Sebut nominal per bulan dan sisa bulannya.",
};

const keApi = (k: Kewajiban): KewajibanApi => ({ id: k.id, nama: k.nama, cicilan_per_bulan: k.cicilanPerBulan, sisa_bulan: k.sisaBulan, sumber: k.sumber === "ai" ? "ai" : "manual" });

function KartuAlat({ a }: { a: HasilAlat }) {
  const k = a.keluaran as Record<string, unknown>;
  if (a.galat)
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-amber-line bg-amber-soft px-4 py-3 text-sm font-medium text-amber">
        <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" />
        Alat menolak: {String(k.galat)}
      </p>
    );
  if (a.alat === "catat_kewajiban") {
    const t = k.tercatat as Record<string, unknown>;
    return (
      <div className="kartu-tint px-4 py-3">
        <p className="flex items-center gap-1.5 text-caption font-bold tracking-wide text-teal-d">
          <Check aria-hidden className="size-4" strokeWidth={2.75} /> Dicatat oleh alat
        </p>
        <p className="angka mt-1 text-ink">
          <strong>{String(t.nama)}</strong> · {String(t.cicilan_per_bulan)} per bulan · sisa {String(t.sisa_bulan)} bulan
        </p>
        <p className="mt-0.5 text-caption text-teal-d">Bisa dihapus di daftar tercatat.</p>
      </div>
    );
  }
  const diAtas = Boolean(k.di_atas_patokan ?? k.melebihi_batas);
  return (
    <div className="kartu px-4 py-3">
      <p className="flex items-center gap-1.5 text-caption font-bold tracking-wide text-text2">
        <Calculator aria-hidden className="size-4" /> Hasil mesin hitung
      </p>
      <p className="angka mt-1 text-2xl font-extrabold text-ink">{String(k.rasio_cicilan)}</p>
      <p className="angka text-sm text-text2">
        {String(k.total_cicilan_per_bulan)} ÷ {String(k.penghasilan_setelah_turun)} · {diAtas ? "di atas" : "dalam"} patokan {String(k.patokan ?? k.batas_rasio)}
      </p>
    </div>
  );
}

export default function Obrolan() {
  const { alur, ubah, utama } = useAlur();
  const { aiTersedia } = useKonfig();
  const nav = useNavigate();
  const id = useId();
  const [pesan, setPesan] = useState<Pesan[]>([SAMBUTAN]);
  const [masukan, setMasukan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [daftarBuka, setDaftarBuka] = useState(false);
  const akhirRef = useRef<HTMLDivElement>(null);
  const tercatat = alur.kewajiban.filter((k) => k.sumber === "ai");

  useEffect(() => {
    if (pesan.length > 1) akhirRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [pesan.length, memuat]);

  const bantuanPrioritas = () => {
    setPesan([SAMBUTAN]);
    setMasukan("");
    nav("/bantuan?prioritas=1&dari=obrolan", { replace: true });
  };

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const teks = masukan.trim();
    if (!teks || memuat) return;
    if (menyiratkanMenyakitiDiri(teks)) return bantuanPrioritas(); // AI tidak dipanggil, pesan tidak disimpan
    const riwayat = [...pesan, { peran: "pengguna" as const, teks }];
    setPesan(riwayat);
    setMasukan("");
    setMemuat(true);
    setGalat(null);
    try {
      const r = await wawancara({
        pesan: riwayat.filter((p) => !p.lokal && p.teks).map((p) => ({ peran: p.peran, teks: p.teks })),
        kewajiban: alur.kewajiban.filter((k) => k.sumber !== "pinjamanku").map(keApi),
        penghasilan: alur.penghasilan,
        cicilan_penawaran: Math.round(utama.hasil?.cicilan ?? 0),
      });
      if ((r as { bantuan_prioritas?: boolean }).bantuan_prioritas) return bantuanPrioritas();
      const dariPinjamanku = alur.kewajiban.filter((k) => k.sumber === "pinjamanku");
      const lama = new Map(alur.kewajiban.map((k) => [k.id, k]));
      ubah({
        kewajiban: [
          ...dariPinjamanku,
          ...r.kewajiban.map((k) => ({
            id: k.id,
            nama: k.nama,
            cicilanPerBulan: k.cicilan_per_bulan,
            sisaBulan: k.sisa_bulan,
            sumber: k.sumber,
            // catatan AI belum dipakai sampai pengguna menekan "Pakai" di Semua cicilan
            dipakai: lama.get(k.id)?.dipakai ?? k.sumber !== "ai",
          })),
        ],
      });
      setPesan((p) => [...p, r.sumber === "ai" ? { peran: "asisten", teks: r.balasan, alat: r.hasil_alat } : { peran: "asisten", teks: "", ditolak: r.alasan, alat: r.hasil_alat }]);
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Obrolan belum bisa dihubungi. Tambah cicilan secara manual.");
    } finally {
      setMemuat(false);
    }
  }

  if (!aiTersedia)
    return (
      <Halaman judul="Obrolan cicilan" kembali="/cek/cicilan" lebar="sempit">
        <Pemberitahuan nada="amber">Fitur AI sedang tidak tersedia. Tambah cicilan secara manual di layar Semua cicilan.</Pemberitahuan>
      </Halaman>
    );

  return (
    <Halaman
      judul="Obrolan cicilan"
      kembali="/cek/cicilan"
      lebar="sempit"
      kanan={
        <button type="button" onClick={() => setDaftarBuka(true)} className="inline-flex min-h-10 items-center rounded-full bg-chip px-3 text-sm font-semibold text-chip-ink hover:bg-line">
          Tercatat {tercatat.length}
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <TagAI />
        <span className="text-sm text-muted">AI mencatat. Angka dihitung mesin.</span>
      </div>
      <div className="space-y-3 pb-36" aria-live="polite">
        {pesan.map((p, i) =>
          p.peran === "pengguna" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-[18px] rounded-br-md bg-teal px-4 py-3 text-on-teal">{p.teks}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] space-y-2">
              {p.ditolak ? (
                <Pemberitahuan nada="amber">Jawaban AI tidak ditampilkan karena pemeriksa RAMBU menolaknya ({p.ditolak.join("; ")}). Hasil mesin hitung tetap tampil, dan daftar tercatat sudah diperbarui.</Pemberitahuan>
              ) : (
                p.teks && <p className="kartu rounded-bl-md px-4 py-3 text-ink">{p.teks}</p>
              )}
              {p.alat?.map((a, j) => <KartuAlat key={j} a={a} />)}
            </div>
          ),
        )}
        {memuat && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Sedang menulis…
          </p>
        )}
        {galat && <Pemberitahuan nada="red">{galat}</Pemberitahuan>}
        <div ref={akhirRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-canvas/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] backdrop-blur lg:left-[248px]">
        <div className="mx-auto max-w-xl">
          <p className="mb-2 text-center text-caption text-muted">Angka dari mesin hitung. AI tidak memberi saran meminjam atau tidak.</p>
          <form onSubmit={kirim} className="flex items-end gap-2">
            <label htmlFor={`${id}-p`} className="sr-only">
              Pesan
            </label>
            <textarea
              id={`${id}-p`}
              rows={1}
              maxLength={1000}
              value={masukan}
              onChange={(e) => setMasukan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Tulis pesan…"
              className="isian min-h-13 flex-1 resize-none rounded-full py-3.5 text-base font-normal"
            />
            <button type="submit" disabled={memuat || !masukan.trim()} aria-label="Kirim pesan" className="grid size-13 shrink-0 place-items-center rounded-full bg-teal text-on-teal hover:bg-teal-hover disabled:opacity-40">
              <SendHorizontal aria-hidden className="size-5" />
            </button>
          </form>
        </div>
      </div>

      <Lembar buka={daftarBuka} onTutup={() => setDaftarBuka(false)} judul="Dicatat oleh alat" kaki={<Tombol blok onClick={() => nav("/cek/cicilan")}>Kembali ke semua cicilan</Tombol>}>
        {tercatat.length === 0 ? (
          <p className="text-text2">Belum ada cicilan yang dicatat dari obrolan.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tercatat.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold text-ink">{k.nama}</span>
                  <span className="angka text-sm text-text2">
                    {rupiah(k.cicilanPerBulan)} per bulan · sisa {k.sisaBulan} bulan
                  </span>
                </span>
                <button type="button" aria-label={`Hapus ${k.nama}`} onClick={() => ubah({ kewajiban: alur.kewajiban.filter((x) => x.id !== k.id) })} className="grid size-11 place-items-center rounded-full text-red hover:bg-red-soft">
                  <Trash2 aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Lembar>
    </Halaman>
  );
}
