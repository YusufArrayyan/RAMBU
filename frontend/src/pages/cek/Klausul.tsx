/** S10 Klausul yang perlu dibaca (DOK-05). Temuan teks, bukan penilaian hukum. */
import { FileSearch, Info, Link2 } from "lucide-react";
import { useEffect } from "react";
import { Halaman } from "@/components/Shell";
import { Kartu, Lencana, TautanTombol } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { useKonfig } from "@/state/config";
import { useAlur } from "@/state/flow";

/** Tujuh kategori usulan (PRD 13.1); daftar akhir ditetapkan bersama penasihat hukum. */
const KATEGORI = [
  ["Denda dan keterlambatan", "Berapa denda per hari dan apakah ada batas maksimalnya."],
  ["Perubahan syarat sepihak", "Apakah pemberi pinjaman bisa mengubah syarat tanpa persetujuanmu (UU 8/1999 Pasal 18)."],
  ["Akses data dan izin perangkat", "Izin kontak, galeri, atau lokasi yang diminta aplikasi."],
  ["Pelunasan dipercepat dan penalti", "Apakah melunasi lebih awal dikenai biaya."],
  ["Biaya tambahan lain", "Asuransi, perpanjangan, atau biaya lain di luar bunga dan admin."],
  ["Penagihan dan pihak ketiga", "Siapa yang boleh menagih dan bagaimana caranya."],
  ["Penyelesaian sengketa dan hukum berlaku", "Ke mana sengketa dibawa dan aturan apa yang dipakai."],
];

export default function Klausul() {
  const { alur } = useAlur();
  const { aiTersedia } = useKonfig();
  const ada = alur.klausul.length > 0;
  useEffect(() => {
    catat("clause_viewed", { jumlah: alur.klausul.length }, true);
  }, [alur.klausul.length]);
  return (
    <Halaman judul="Klausul yang perlu dibaca" kembali={true} aksi={<TautanTombol to="/cek/hasil" blok varian="kedua">Kembali ke hasil</TautanTombol>}>
      <Kartu className="flex items-start gap-3">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
        <p className="text-text2">Temuan teks, bukan penilaian hukum. {ada ? "Dibaca AI, kutipan diperiksa kode: hanya kutipan yang ada persis di teksmu yang tampil." : ""}</p>
      </Kartu>

      {ada ? (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {alur.klausul.map((k, i) => (
            <Kartu key={i} as="li">
              <Lencana>{k.judul || k.kategori}</Lencana>
              <blockquote className="mt-3 rounded-xl border border-line bg-sunken px-4 py-3 text-ink italic">“{k.kutipan}”</blockquote>
              <p className="mt-3 text-text2">
                <strong className="text-ink">Penjelasan RAMBU.</strong> {k.penjelasan}
              </p>
              {k.rujukan && (
                <p className="mt-2 inline-flex items-start gap-2 text-sm font-semibold text-teal-d">
                  <Link2 aria-hidden className="mt-0.5 size-4 shrink-0" />
                  Rujukan: {k.rujukan}
                </p>
              )}
            </Kartu>
          ))}
        </ul>
      ) : (
        <Kartu className="mt-4">
          <div className="flex items-start gap-3">
            <FileSearch aria-hidden className="mt-0.5 size-6 shrink-0 text-teal" />
            <div>
              <h2 className="t-h2">{alur.metodeIsi === "manual" && !aiTersedia ? "Baca dokumenmu dengan tujuh hal ini" : "Tidak ada temuan, tetap baca dokumenmu"}</h2>
              <p className="mt-1 text-text2">
                {aiTersedia ? "Klausul hanya muncul bila kamu menempel teks penawaran di tab Tempel dokumen. " : ""}
                Saat membaca kontrak, cari tujuh hal berikut:
              </p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {KATEGORI.map(([judul, isi], i) => (
              <li key={judul} className="flex gap-3">
                <span className="angka grid size-7 shrink-0 place-items-center rounded-full bg-chip text-sm font-bold text-chip-ink">{i + 1}</span>
                <span>
                  <span className="block font-semibold text-ink">{judul}</span>
                  <span className="block text-sm text-text2">{isi}</span>
                </span>
              </li>
            ))}
          </ol>
          {aiTersedia && (
            <TautanTombol to="/cek" varian="kedua" className="mt-5">
              Tempel dokumen penawaran
            </TautanTombol>
          )}
        </Kartu>
      )}
      <p className="mt-4 text-sm text-muted">
        {alur.klausulDibuang > 0 && `${alur.klausulDibuang} klausul dibuang karena kutipannya tidak ada di teks. `}
        RAMBU bisa melewatkan klausul penting: tetap baca dokumenmu.
      </p>
    </Halaman>
  );
}
