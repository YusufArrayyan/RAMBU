/**
 * Komponen dasar sistem desain RAMBU v4 (PRD 8.3). Galeri hidup: rute /desain.
 */
import {
  Check,
  CircleCheck,
  Clock,
  Info,
  MessageCircle,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import type { StatusCicilan } from "@/lib/jadwal";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// --- Tombol --------------------------------------------------------------------

export type VarianTombol = "utama" | "kedua" | "teks" | "hapus";

function kelasTombol(varian: VarianTombol, kecil?: boolean, blok?: boolean) {
  return cx("tombol", `tombol-${varian}`, kecil && "tombol-kecil", blok && "w-full");
}

export function Tombol({
  varian = "utama",
  kecil,
  blok,
  ikon: Ikon,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: VarianTombol; kecil?: boolean; blok?: boolean; ikon?: LucideIcon }) {
  return (
    <button type={type} className={cx(kelasTombol(varian, kecil, blok), className)} {...props}>
      {Ikon && <Ikon aria-hidden className="size-5 shrink-0" />}
      {children}
    </button>
  );
}

export function TautanTombol({
  varian = "utama",
  kecil,
  blok,
  ikon: Ikon,
  className,
  children,
  ...props
}: LinkProps & { varian?: VarianTombol; kecil?: boolean; blok?: boolean; ikon?: LucideIcon }) {
  return (
    <Link className={cx(kelasTombol(varian, kecil, blok), className)} {...props}>
      {Ikon && <Ikon aria-hidden className="size-5 shrink-0" />}
      {children}
    </Link>
  );
}

// --- Kartu ---------------------------------------------------------------------

export type VarianKartu = "dasar" | "tint" | "perhatian" | "catatan";
const KELAS_KARTU: Record<VarianKartu, string> = {
  dasar: "kartu",
  tint: "kartu-tint",
  perhatian: "kartu-perhatian",
  catatan: "kartu-catatan",
};

export function Kartu({
  varian = "dasar",
  className,
  children,
  as: As = "section",
  ...props
}: { varian?: VarianKartu; className?: string; children: ReactNode; as?: "section" | "div" | "article" | "aside" | "li" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx(KELAS_KARTU[varian], !/(^|\s)([a-z]+:)?p[xytrbl]?-/.test(className ?? "") && "p-5 lg:p-6", className)} {...props}>
      {children}
    </As>
  );
}

export function JudulKartu({ id, children, aksi, className }: { id?: string; children: ReactNode; aksi?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3", className)}>
      <h2 id={id} className="t-h2">
        {children}
      </h2>
      {aksi}
    </div>
  );
}

// --- Lencana -------------------------------------------------------------------

export type Nada = "netral" | "teal" | "amber" | "red";
const KELAS_NADA: Record<Nada, string> = {
  netral: "bg-chip text-chip-ink",
  teal: "bg-tint text-teal-d",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
};

export function Lencana({ nada = "netral", ikon: Ikon, children, className, kecil }: { nada?: Nada; ikon?: LucideIcon; children: ReactNode; className?: string; kecil?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full font-semibold leading-tight",
        kecil ? "min-h-6 gap-1 px-2 py-0.5 text-caption" : "min-h-8 gap-1.5 px-3 py-1 text-sm",
        KELAS_NADA[nada],
        className,
      )}
    >
      {Ikon && <Ikon aria-hidden className={cx("shrink-0", kecil ? "size-3.5" : "size-4")} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export const STATUS_CICILAN: Record<StatusCicilan, { label: string; nada: Nada; ikon?: LucideIcon }> = {
  terjadwal: { label: "Terjadwal", nada: "netral" },
  mendekati: { label: "Mendekati", nada: "amber", ikon: Clock },
  jatuh_tempo: { label: "Jatuh tempo", nada: "amber", ikon: TriangleAlert },
  terlambat: { label: "Terlambat", nada: "red", ikon: TriangleAlert },
  dinegosiasikan: { label: "Dinegosiasikan", nada: "netral", ikon: MessageCircle },
  dibayar: { label: "Dibayar", nada: "teal", ikon: Check },
  dibayar_terlambat: { label: "Dibayar terlambat", nada: "teal", ikon: Check },
};

/** Status selalu ikon + teks, tidak hanya warna. */
export function LencanaStatus({ status, className }: { status: StatusCicilan; className?: string }) {
  const s = STATUS_CICILAN[status];
  return (
    <Lencana nada={s.nada} ikon={s.ikon} className={className}>
      {s.label}
    </Lencana>
  );
}

export function LabelPerkiraan() {
  return (
    <span className="inline-flex min-h-8 items-center rounded-full bg-chip px-3 text-sm font-semibold text-chip-ink" title="Hasil berupa perkiraan dengan bunga flat harian">
      Perkiraan
    </span>
  );
}

export function TagAI({ teks = "AI" }: { teks?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-tint-line bg-tint px-2 py-0.5 text-caption font-bold text-teal-d">
      <Sparkles aria-hidden className="size-3.5" />
      {teks}
    </span>
  );
}

export function DataContoh() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-line bg-amber-soft px-3 py-1 text-caption font-bold tracking-wide text-amber">
      DATA CONTOH
    </span>
  );
}

// --- Kontrol -------------------------------------------------------------------

export function Segmented<T extends string>({
  label,
  pilihan,
  nilai,
  onNilai,
  className,
}: {
  label: string;
  pilihan: { nilai: T; label: ReactNode }[];
  nilai: T;
  onNilai: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex rounded-[14px] bg-sunken p-1", className)}>
      {pilihan.map((p) => {
        const aktif = p.nilai === nilai;
        return (
          <button
            key={p.nilai}
            type="button"
            role="radio"
            aria-checked={aktif}
            onClick={() => onNilai(p.nilai)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = pilihan.findIndex((x) => x.nilai === nilai);
              const j = (i + (e.key === "ArrowRight" ? 1 : -1) + pilihan.length) % pilihan.length;
              onNilai(pilihan[j].nilai);
              (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
            }}
            tabIndex={aktif ? 0 : -1}
            className={cx(
              "min-h-11 flex-1 rounded-[11px] px-3 text-[0.9375rem] font-semibold transition-colors duration-150",
              aktif ? "bg-surface text-ink shadow-[0_1px_2px_rgb(15_23_42/0.08),0_0_0_1px_var(--line)]" : "text-text2 hover:text-ink",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function Sakelar({
  label,
  keterangan,
  nilai,
  onNilai,
  disabled,
}: {
  label: ReactNode;
  keterangan?: ReactNode;
  nilai: boolean;
  onNilai: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block font-semibold text-ink">
          {label}
        </label>
        {keterangan && (
          <p id={`${id}-k`} className="mt-0.5 text-sm text-muted">
            {keterangan}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={nilai}
        aria-describedby={keterangan ? `${id}-k` : undefined}
        disabled={disabled}
        onClick={() => onNilai(!nilai)}
        className="group relative inline-flex h-11 w-[52px] shrink-0 items-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden className={cx("absolute inset-x-0 h-8 rounded-full transition-colors duration-200", nilai ? "bg-teal" : "bg-line-strong")} />
        <span aria-hidden className={cx("absolute left-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-quart", nilai && "translate-x-5")} />
      </button>
    </div>
  );
}

export function KotakCentang({ checked, onChange, children, name }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; name?: string }) {
  return (
    <label className="group flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cx(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-150 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]",
          checked ? "border-teal bg-teal text-on-teal" : "border-line-strong bg-surface",
        )}
      >
        {checked && <Check className="size-4.5" strokeWidth={3} />}
      </span>
      <span className="text-[1.0625rem] leading-relaxed text-ink">{children}</span>
    </label>
  );
}

/** Chip pilihan berbingkai (mis. H-3). Terpilih: tint + centang + tepi teal. */
export function Chip({ terpilih, onClick, children }: { terpilih: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={terpilih}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] px-4 font-semibold transition-colors duration-150",
        terpilih ? "border-teal bg-tint text-teal-d" : "border-line-strong bg-surface text-ink hover:border-teal",
      )}
    >
      {terpilih && <Check aria-hidden className="size-4" strokeWidth={2.75} />}
      {children}
    </button>
  );
}

// --- Baris dan catatan ---------------------------------------------------------

export function TombolInfo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-teal hover:bg-tint">
      <Info aria-hidden className="size-5" />
    </button>
  );
}

export function Catatan({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-sm leading-relaxed text-muted", className)}>{children}</p>;
}

export function Pemberitahuan({ nada = "teal", ikon: Ikon = CircleCheck, children }: { nada?: "teal" | "amber" | "red"; ikon?: LucideIcon; children: ReactNode }) {
  return (
    <div
      role={nada === "red" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-3 rounded-2xl border px-4 py-3",
        nada === "teal" && "border-tint-line bg-tint text-teal-d",
        nada === "amber" && "border-amber-line bg-amber-soft text-amber",
        nada === "red" && "border-red bg-red-soft text-red",
      )}
    >
      <Ikon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 text-[0.9375rem] font-medium leading-relaxed">{children}</div>
    </div>
  );
}

export function Kosong({ ikon: Ikon, judul, children, aksi }: { ikon: LucideIcon; judul: string; children?: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-tint text-teal">
        <Ikon aria-hidden className="size-7" />
      </span>
      <h2 className="t-h2 mt-4">{judul}</h2>
      {children && <p className="mt-1.5 max-w-sm text-text2">{children}</p>}
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  );
}
