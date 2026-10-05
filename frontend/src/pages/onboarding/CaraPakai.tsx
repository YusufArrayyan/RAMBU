/** S02 Cara memakai (ONB-02): tamu (bawaan) atau akun, tanpa tekanan. */
import { CalendarDays, Check, KeyRound, ShieldCheck, Trash2, UserX } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Halaman } from "@/components/Shell";
import { Tombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { useApp, type Mode } from "@/state/app";
import { useKonfig } from "@/state/config";

function Pilihan({
  terpilih,
  onPilih,
  judul,
  isi,
  ciri,
  nonaktif,
}: {
  terpilih: boolean;
  onPilih: () => void;
  judul: string;
  isi: string;
  ciri: { Ikon: typeof Check; teks: string }[];
  nonaktif?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={terpilih}
      disabled={!!nonaktif}
      onClick={onPilih}
      className={cx(
        "w-full rounded-2xl border-2 p-5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        terpilih ? "border-teal bg-tint" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="t-h2">{judul}</span>
        <span aria-hidden className={cx("grid size-7 shrink-0 place-items-center rounded-full border-2", terpilih ? "border-teal bg-teal text-on-teal" : "border-line-strong")}>
          {terpilih && <Check className="size-4" strokeWidth={3} />}
        </span>
      </span>
      <span className="mt-1.5 block text-text2">{isi}</span>
      <span className="mt-3 flex flex-wrap gap-2">
        {ciri.map(({ Ikon, teks }) => (
          <span key={teks} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", terpilih ? "bg-surface text-teal-d" : "bg-chip text-chip-ink")}>
            <Ikon aria-hidden className="size-4" />
            {teks}
          </span>
        ))}
      </span>
      {nonaktif && <span className="mt-3 block text-sm font-medium text-amber">{nonaktif}</span>}
    </button>
  );
}

export default function CaraPakai() {
  const { aksi } = useApp();
  const { akunTersedia, dimuat } = useKonfig();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("tamu");

  const lanjut = () => {
    catat("onboarding_mode_selected", { mode });
    if (mode === "akun") return nav("/masuk?baru=1");
    aksi.setMode("tamu");
    nav("/profil-awal");
  };

  return (
    <Halaman judul="Cara memakai" kembali="/selamat-datang" lebar="sempit" aksi={<Tombol blok onClick={lanjut}>Lanjut</Tombol>}>
      <h2 className="t-h1">Mau pakai dengan cara apa?</h2>
      <p className="mt-1.5 text-text2">Kamu bisa pindah cara kapan saja.</p>
      <div role="radiogroup" aria-label="Cara memakai RAMBU" className="mt-6 space-y-3">
        <Pilihan
          terpilih={mode === "tamu"}
          onPilih={() => setMode("tamu")}
          judul="Tamu"
          isi="Cek biaya dan catat pinjaman tanpa akun. Data hanya ada di perangkat ini."
          ciri={[
            { Ikon: UserX, teks: "Tanpa akun" },
            { Ikon: CalendarDays, teks: "Pengingat lewat kalender" },
          ]}
        />
        <Pilihan
          terpilih={mode === "akun"}
          onPilih={() => setMode("akun")}
          judul="Buat akun"
          isi="Untuk pengingat otomatis lewat notifikasi atau email, dan cadangan data."
          ciri={[
            { Ikon: KeyRound, teks: "Tanpa kata sandi" },
            { Ikon: Trash2, teks: "Bisa dihapus kapan saja" },
          ]}
          nonaktif={dimuat && !akunTersedia ? "Akun belum tersedia di server ini. Mode tamu tetap bisa dipakai penuh." : undefined}
        />
      </div>
      <div className="kartu-catatan mt-5 flex gap-3 p-4">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
        <p className="text-sm leading-relaxed text-text2">
          Mode tamu tidak mengirim data keuanganmu ke server mana pun. Akun hanya menyimpan jadwal cicilan dan pengaturan pengingat; nama penyelenggara dan jumlah disimpan hanya bila kamu mengisinya.
        </p>
      </div>
      <p className="mt-6 text-sm text-text2">
        Dengan melanjutkan, kamu menyetujui{" "}
        <Link to="/privasi" className="tautan">
          Ringkasan privasi
        </Link>
        .
      </p>
    </Halaman>
  );
}
