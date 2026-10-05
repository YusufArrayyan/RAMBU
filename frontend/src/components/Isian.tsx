/**
 * Isian (PRD 8.3: default, fokus, galat, dengan satuan). Format Indonesia saat mengetik:
 * titik ribuan untuk rupiah, koma desimal untuk persen (CEK-02).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { bersihkanDesimal, parseDesimal, parseRupiah, tampilDesimal, tampilRupiah } from "@/lib/format";
import { cx } from "./ui";

export type JenisAngka = "rupiah" | "desimal" | "bulat";

function tampil(jenis: JenisAngka, n: number | null) {
  if (n == null) return "";
  return jenis === "desimal" ? tampilDesimal(n) : tampilRupiah(n);
}

function useIsianAngka(jenis: JenisAngka, nilai: number | null, onNilai: (n: number | null) => void, maxDesimal: number) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [teks, setTeks] = useState(() => tampil(jenis, nilai));

  useEffect(() => {
    const sekarang = jenis === "desimal" ? parseDesimal(teks) : parseRupiah(teks);
    if (sekarang !== nilai) setTeks(tampil(jenis, nilai));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilai, jenis]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const mentah = el.value;
    if (jenis === "desimal") {
      const bersih = bersihkanDesimal(mentah, maxDesimal);
      setTeks(bersih);
      onNilai(parseDesimal(bersih));
      return;
    }
    const kursor = el.selectionStart ?? mentah.length;
    const digitSebelum = mentah.slice(0, kursor).replace(/\D/g, "").length;
    const angka = parseRupiah(mentah.slice(0, 15));
    const baru = jenis === "rupiah" ? tampilRupiah(angka) : angka == null ? "" : String(angka);
    setTeks(baru);
    onNilai(angka);
    requestAnimationFrame(() => {
      if (!ref.current || document.activeElement !== ref.current) return;
      let pos = 0;
      let hit = 0;
      while (pos < baru.length && hit < digitSebelum) {
        if (/\d/.test(baru[pos])) hit++;
        pos++;
      }
      ref.current.setSelectionRange(pos, pos);
    });
  }
  return { ref, teks, onChange };
}

interface Bingkai {
  label: ReactNode;
  opsional?: boolean;
  petunjuk?: ReactNode;
  galat?: string | null;
  className?: string;
}

function Kerangka({ id, label, opsional, petunjuk, galat, className, children }: Bingkai & { id: string; children: ReactNode }) {
  return (
    <div className={cx("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[0.9375rem] font-semibold text-ink">
        {label}
        {opsional && <span className="font-normal text-muted"> (opsional)</span>}
      </label>
      {children}
      <div aria-live="polite">
        {galat ? (
          <p id={`${id}-galat`} className="mt-1.5 text-sm font-medium text-red">
            {galat}
          </p>
        ) : petunjuk ? (
          <p id={`${id}-petunjuk`} className="mt-1.5 text-sm text-muted">
            {petunjuk}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const desc = (id: string, petunjuk: unknown, galat: unknown) => (galat ? `${id}-galat` : petunjuk ? `${id}-petunjuk` : undefined);

export function IsianAngka(
  p: Bingkai & {
    name: string;
    jenis: JenisAngka;
    nilai: number | null;
    onNilai: (n: number | null) => void;
    satuan?: string;
    placeholder?: string;
    maxDesimal?: number;
    onBlur?: () => void;
    autoFocus?: boolean;
  },
) {
  const id = useId();
  const { ref, teks, onChange } = useIsianAngka(p.jenis, p.nilai, p.onNilai, p.maxDesimal ?? 3);
  const satuan = p.satuan ?? (p.jenis === "rupiah" ? "Rp" : undefined);
  return (
    <Kerangka id={id} {...p}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          name={p.name}
          type="text"
          inputMode={p.jenis === "desimal" ? "decimal" : "numeric"}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder={p.placeholder}
          value={teks}
          onChange={onChange}
          onBlur={p.onBlur}
          autoFocus={p.autoFocus}
          aria-invalid={p.galat ? true : undefined}
          aria-describedby={desc(id, p.petunjuk, p.galat)}
          className={cx("isian", satuan && "pr-16")}
        />
        {satuan && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-medium text-muted">
            {satuan}
          </span>
        )}
      </div>
    </Kerangka>
  );
}

export function IsianTeks(
  p: Bingkai & {
    name: string;
    nilai: string;
    onNilai: (s: string) => void;
    type?: "text" | "email" | "date" | "time";
    placeholder?: string;
    maxLength?: number;
    autoComplete?: string;
    inputMode?: "text" | "email" | "numeric";
    onBlur?: () => void;
  },
) {
  const id = useId();
  return (
    <Kerangka id={id} {...p}>
      <input
        id={id}
        name={p.name}
        type={p.type ?? "text"}
        autoComplete={p.autoComplete ?? "off"}
        spellCheck={false}
        inputMode={p.inputMode}
        maxLength={p.maxLength}
        placeholder={p.placeholder}
        value={p.nilai}
        onChange={(e) => p.onNilai(e.target.value)}
        onBlur={p.onBlur}
        aria-invalid={p.galat ? true : undefined}
        aria-describedby={desc(id, p.petunjuk, p.galat)}
        className="isian"
      />
    </Kerangka>
  );
}

export function IsianPilih<T extends string>(
  p: Bingkai & { name: string; nilai: T; onNilai: (v: T) => void; pilihan: { nilai: T; label: string }[] },
) {
  const id = useId();
  return (
    <Kerangka id={id} {...p}>
      <select
        id={id}
        name={p.name}
        value={p.nilai}
        onChange={(e) => p.onNilai(e.target.value as T)}
        aria-describedby={desc(id, p.petunjuk, p.galat)}
        className="isian appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 fill=%22none%22 stroke=%22%235b6b82%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-12"
      >
        {p.pilihan.map((o) => (
          <option key={o.nilai} value={o.nilai}>
            {o.label}
          </option>
        ))}
      </select>
    </Kerangka>
  );
}
