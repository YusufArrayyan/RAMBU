/**
 * S07 Baca dokumen (DOK-01 s.d. DOK-07). AI mengusulkan, kode memverifikasi kutipan, pengguna
 * mengonfirmasi sebelum kolom terisi. Model hanya dipanggil saat tombol ditekan.
 */
import { CircleCheck, ImageUp, Loader2, Lock, Sparkles } from "lucide-react";
import { useId, useRef, useState } from "react";
import { ApiError, bacaDokumen, salinGambar, type HasilBacaDokumen, type Klausul } from "@/lib/api";
import { persen, rupiah } from "@/lib/format";
import { KotakCentang, Lencana, Pemberitahuan, TagAI, Tombol } from "./ui";

const MAKS = 8000;
const MAKS_BYTE = 5 * 1024 * 1024;

export interface AngkaDokumen {
  pokok?: number;
  tenor?: number;
  bunga?: number;
  admin?: number;
}

const LABEL: Record<keyof AngkaDokumen, string> = { pokok: "Pinjaman", tenor: "Tenor", bunga: "Bunga", admin: "Biaya admin" };

function tampilNilai(k: keyof AngkaDokumen, v: number) {
  if (k === "pokok") return rupiah(v);
  if (k === "tenor") return `${v} hari`;
  if (k === "bunga") return `${persen(v, 4)} per hari`;
  return `${persen(v, 2)} dari pokok`;
}

export function BacaDokumen({ onIsi, onKlausul }: { onIsi: (a: AngkaDokumen) => void; onKlausul: (k: Klausul[], dibuang: number) => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [teks, setTeks] = useState("");
  const [memuat, setMemuat] = useState<"baca" | "salin" | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilBacaDokumen | null>(null);
  const [cocok, setCocok] = useState(false);
  const [baruDisalin, setBaruDisalin] = useState(false);

  async function salin(file: File) {
    setGalat(null);
    if (!["image/jpeg", "image/png"].includes(file.type)) return setGalat("Pilih gambar JPG atau PNG.");
    if (file.size > MAKS_BYTE) return setGalat("Ukuran gambar maksimal 5 MB. Potong ke bagian penawaran saja.");
    setMemuat("salin");
    try {
      const t = await salinGambar(file);
      setTeks(t.slice(0, MAKS));
      setHasil(null);
      setBaruDisalin(true);
    } catch (e) {
      setGalat(e instanceof ApiError ? e.message : "Gambar belum bisa disalin. Ketik atau tempel teksnya.");
    } finally {
      setMemuat(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function baca() {
    setGalat(null);
    setMemuat("baca");
    setCocok(false);
    try {
      const h = await bacaDokumen(teks);
      setHasil(h);
      setBaruDisalin(false);
      onKlausul(h.klausul, h.klausul_dibuang);
    } catch (e) {
      setGalat(e instanceof ApiError ? e.message : "Dokumen belum bisa dibaca. Isi kolom secara manual.");
    } finally {
      setMemuat(null);
    }
  }

  const angka = hasil ? (Object.entries(hasil.angka) as [keyof AngkaDokumen, HasilBacaDokumen["angka"]["pokok"]][]).filter(([, v]) => v) : [];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-teks`} className="mb-1.5 block text-[0.9375rem] font-semibold text-ink">
          Teks penawaran atau kontrak
        </label>
        <textarea
          id={`${id}-teks`}
          name="teks-dokumen"
          value={teks}
          maxLength={MAKS}
          rows={7}
          spellCheck={false}
          onChange={(e) => {
            setTeks(e.target.value);
            setHasil(null);
          }}
          placeholder="Tempel teks dari aplikasi pinjaman di sini…"
          aria-describedby={`${id}-hitung`}
          className="isian min-h-40 resize-y py-3 text-base leading-relaxed font-normal"
        />
        <div className="mt-1 flex items-center justify-between gap-3 text-sm text-muted">
          <span>{baruDisalin ? "Periksa dan koreksi hasil salinan sebelum dibaca." : "Gambar hanya disalin menjadi teks yang bisa kamu koreksi."}</span>
          <span id={`${id}-hitung`} className="angka shrink-0">
            {teks.length.toLocaleString("id-ID")} / 8.000
          </span>
        </div>
      </div>

      <div className="kartu-perhatian flex items-start gap-3 px-4 py-3 text-[0.9375rem] font-medium text-amber">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Tutup nama dan nomor pribadi sebelum membaca. Teks dikirim ke layanan AI hanya setelah kamu menekan tombol, dan tidak disimpan RAMBU.
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) salin(f);
          }}
        />
        <Tombol varian="kedua" disabled={memuat !== null} onClick={() => fileRef.current?.click()} aria-busy={memuat === "salin"}>
          {memuat === "salin" ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <ImageUp aria-hidden className="size-5" />}
          {memuat === "salin" ? "Menyalin…" : "Salin dari gambar"}
        </Tombol>
        <Tombol varian="kedua" disabled={memuat !== null || teks.trim().length < 10} onClick={baca} aria-busy={memuat === "baca"}>
          {memuat === "baca" ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Sparkles aria-hidden className="size-5" />}
          {memuat === "baca" ? "Membaca…" : "Baca dokumen"}
          <TagAI />
        </Tombol>
      </div>

      {galat && <Pemberitahuan nada="red">{galat} Tidak ada percobaan ulang otomatis.</Pemberitahuan>}

      {hasil && (
        <div className="muncul kartu p-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="t-h2">Angka yang ditemukan</h3>
            {angka.length > 0 && (
              <Lencana nada="teal" ikon={CircleCheck}>
                Kutipan terverifikasi
              </Lencana>
            )}
          </div>
          {angka.length === 0 ? (
            <p className="mt-2 text-text2">Tidak ada angka dengan kutipan yang cocok. Isi kolom secara manual.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {angka.map(([k, v]) => (
                <li key={k} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-text2">{LABEL[k]}</span>
                    <span className="angka font-bold text-ink">{tampilNilai(k, v!.nilai)}</span>
                  </div>
                  <blockquote className="mt-1.5 rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-text2 italic">“{v!.kutipan}”</blockquote>
                  {v!.catatan && <p className="mt-1 text-sm text-muted">{v!.catatan}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm text-muted">
            {[
              hasil.angka_ditolak.length > 0 && `${hasil.angka_ditolak.length} angka dibuang (${hasil.angka_ditolak.map((d) => `${d.bidang}: ${d.alasan}`).join("; ")})`,
              hasil.klausul_dibuang > 0 && `${hasil.klausul_dibuang} temuan dibuang karena kutipannya tidak ada di teks`,
              hasil.klausul.length > 0 && `${hasil.klausul.length} klausul tampil di layar Klausul`,
            ]
              .filter(Boolean)
              .join(" · ") || "Tidak ada temuan yang dibuang."}
          </p>
          {angka.length > 0 && (
            <div className="mt-4 space-y-3">
              <KotakCentang checked={cocok} onChange={setCocok}>
                Angka di atas sudah saya cocokkan dengan penawaran asli.
              </KotakCentang>
              <Tombol
                blok
                disabled={!cocok}
                onClick={() => {
                  const a: AngkaDokumen = {};
                  for (const [k, v] of angka) a[k] = v!.nilai;
                  onIsi(a);
                }}
              >
                Pakai angka ini
              </Tombol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
