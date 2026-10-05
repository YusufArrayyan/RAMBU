/**
 * BottomSheet (PRD 8.3) dengan <dialog> native: fokus terkunci, Esc menutup, latar gelap.
 * Di desktop tampil sebagai dialog tengah.
 */
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Hasil, Masukan } from "@/lib/engine";
import { catat } from "@/lib/analytics";
import { telusur, type Besaran } from "@/lib/telusur";
import { TombolInfo } from "./ui";

export function Lembar({ buka, onTutup, judul, children, kaki }: { buka: boolean; onTutup: () => void; judul: ReactNode; children: ReactNode; kaki?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);
  return (
    <dialog
      ref={ref}
      className="lembar"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onTutup();
      }}
    >
      {buka && (
        <div className="flex max-h-[88dvh] flex-col">
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <h2 id={id} className="t-h2 pt-1.5">
              {judul}
            </h2>
            <button type="button" onClick={onTutup} aria-label="Tutup" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text2 hover:bg-sunken">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          {kaki && <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{kaki}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Blok rumus langkah demi langkah dengan angka pengguna (FormulaBlock). */
export function BlokRumus({ rumus, langkah }: { rumus: string; langkah: string[] }) {
  return (
    <div className="rumus">
      <div className="font-semibold">{rumus}</div>
      {langkah.map((l, i) => (
        <div key={i} className={i === langkah.length - 1 ? "font-bold" : undefined}>
          {l}
        </div>
      ))}
    </div>
  );
}

/** Ikon ⓘ pada angka penting yang membuka telusur rumus (XAI-01). */
export function InfoTelusur({ besaran, masukan, hasil, label }: { besaran: Besaran; masukan: Masukan; hasil: Hasil; label: string }) {
  const [buka, setBuka] = useState(false);
  const t = telusur(besaran, masukan, hasil);
  if (!t) return null;
  return (
    <>
      <TombolInfo
        label={`Dari mana angka ${label}?`}
        onClick={() => {
          setBuka(true);
          catat("telusur_opened", { besaran });
        }}
      />
      <Lembar buka={buka} onTutup={() => setBuka(false)} judul={t.judul}>
        <BlokRumus rumus={t.rumus} langkah={t.langkah} />
        <p className="mt-3 text-sm leading-relaxed text-muted">{t.keterangan}</p>
      </Lembar>
    </>
  );
}
