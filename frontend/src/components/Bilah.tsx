/**
 * Bilah rasio (penanda tegak = patokan) dan grafik batang sederhana (PRD 8.3).
 * Setiap grafik punya teks pengganti untuk pembaca layar (PRD 8.4).
 */
import { CircleCheck, TriangleAlert } from "lucide-react";
import { persen, persenKata } from "@/lib/format";
import { Lencana, cx } from "./ui";

export function BilahRasio({
  nilai,
  patokan = 30,
  skalaMaks = 50,
  label,
  tampilSkala,
  tebal,
}: {
  nilai: number;
  patokan?: number;
  skalaMaks?: number;
  label: string;
  tampilSkala?: boolean;
  tebal?: boolean;
}) {
  const atas = nilai > patokan + 1e-9;
  const isi = Math.min(1, Math.max(0, nilai / skalaMaks));
  const posPatokan = (patokan / skalaMaks) * 100;
  const alt = `${label}: ${persenKata(nilai)} penghasilan, ${atas ? "di atas" : "dalam"} patokan ${patokan} persen`;
  return (
    <div>
      <div role="img" aria-label={alt} className={cx("relative w-full rounded-full bg-chip", tebal ? "h-4" : "h-3")}>
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className={cx("isi-bilah h-full w-full rounded-full", atas ? "bg-amber-bar" : "bg-teal")} style={{ transform: `scaleX(${isi})` }} />
        </div>
        <div aria-hidden className="absolute -top-2 -bottom-2 w-[3px] -translate-x-1/2 rounded-full bg-mark" style={{ left: `${posPatokan}%` }} />
      </div>
      {tampilSkala && (
        <div aria-hidden className="relative mt-2 h-5 text-sm text-muted">
          <span className="absolute left-0">0%</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${posPatokan}%` }}>
            patokan {patokan}%
          </span>
          <span className="absolute right-0">{skalaMaks}%</span>
        </div>
      )}
    </div>
  );
}

export function LencanaPatokan({ diAtas, patokan = 30 }: { diAtas: boolean; patokan?: number }) {
  return diAtas ? (
    <Lencana nada="amber" ikon={TriangleAlert}>
      Di atas patokan {patokan}%
    </Lencana>
  ) : (
    <Lencana nada="teal" ikon={CircleCheck}>
      Dalam patokan {patokan}%
    </Lencana>
  );
}

/** Batang vertikal dengan nilai tertulis; garis putus-putus opsional untuk patokan. */
export function GrafikBatang({
  data,
  label,
  garis,
  format = (v: number) => String(Math.round(v)),
  maks,
  sorot,
  tinggi = 168,
}: {
  data: { label: string; nilai: number; nada?: "teal" | "amber" }[];
  label: string;
  garis?: { nilai: number; label: string };
  format?: (v: number) => string;
  maks?: number;
  sorot?: number;
  tinggi?: number;
}) {
  const atas = Math.max(maks ?? 0, garis?.nilai ?? 0, ...data.map((d) => d.nilai), 1) * 1.18;
  const ringkas = `${label}: ${data.map((d) => `${d.label} ${format(d.nilai)}`).join(", ")}${garis ? `; ${garis.label}` : ""}`;
  return (
    <figure className="m-0" role="img" aria-label={ringkas}>
      <div aria-hidden className="relative border-b border-line" style={{ height: tinggi }}>
        {garis && (
          <div className="absolute inset-x-0 z-10 border-t-2 border-dashed border-mark" style={{ bottom: `${(garis.nilai / atas) * 100}%` }}>
            <span className="absolute right-0 bottom-1 rounded bg-surface/90 px-1 text-caption font-semibold text-ink">{garis.label}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {data.map((d, i) => (
            <div key={d.label + i} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className={cx(
                  "relative w-full max-w-12 rounded-t-lg transition-[height] duration-300 ease-out-quart",
                  d.nada === "amber" ? "bg-amber-bar" : "bg-teal",
                  sorot !== undefined && sorot !== i && "opacity-50",
                )}
                style={{ height: `${(d.nilai / atas) * 100}%`, minHeight: d.nilai > 0 ? 4 : 0 }}
              >
                <span className="angka absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-caption font-bold text-ink sm:text-sm">{format(d.nilai)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-1.5 flex gap-2 sm:gap-3">
        {data.map((d, i) => (
          <span key={d.label + i} className={cx("min-w-0 flex-1 truncate text-center text-caption text-muted sm:text-sm", sorot === i && "font-bold text-ink")}>
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export const formatPersen1 = (v: number) => persen(v, 1);
