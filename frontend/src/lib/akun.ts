/**
 * Akun opsional (PRD v4 3.3, ACC-01, ACC-04 s.d. ACC-07). Tautan masuk sekali pakai 15 menit
 * dengan cadangan kode 6 digit; tanpa kata sandi. Hanya dipanggil dalam mode akun.
 */
import type { DataApp } from "@/state/app";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class GalatAkun extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function panggil<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new GalatAkun("Tidak ada koneksi ke server RAMBU. Data di perangkatmu tetap aman.", 0);
  }
  if (!res.ok) {
    let pesan = "Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.";
    try {
      const b = await res.json();
      if (typeof b.detail === "string") pesan = b.detail;
    } catch {
      /* abaikan */
    }
    throw new GalatAkun(pesan, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface HasilKirimTautan {
  dikirim: true;
  berlaku_menit: number;
  /** Hanya di lingkungan pengembangan tanpa layanan email: kode ditampilkan agar alur bisa diuji. */
  kode_pengembangan?: string;
}

export const kirimTautan = (email: string, setujuUsia: boolean) =>
  panggil<HasilKirimTautan>("/api/akun/tautan", { method: "POST", body: JSON.stringify({ email, setuju_usia: setujuUsia }) });

export const verifikasi = (body: { email: string; kode: string } | { tautan: string }) =>
  panggil<{ token: string; email: string; baru: boolean }>("/api/akun/verifikasi", { method: "POST", body: JSON.stringify(body) });

export interface DataServer {
  profil: DataApp["profil"] | null;
  pinjaman: DataApp["pinjaman"];
  pengingat: DataApp["pengingat"] | null;
  diubah: string | null;
}

export const ambilData = (token: string) => panggil<DataServer>("/api/akun/data", { token });

export function sinkronkanAkun(d: DataApp) {
  if (d.mode !== "akun" || !d.akun) return Promise.resolve();
  const body: DataServer = { profil: d.profil, pinjaman: d.pinjaman, pengingat: d.pengingat, diubah: d.diubah };
  return panggil<void>("/api/akun/data", { method: "PUT", token: d.akun.token, body: JSON.stringify(body) });
}

export const hapusAkunServer = (token: string) => panggil<void>("/api/akun", { method: "DELETE", token });
export const keluarServer = (token: string) => panggil<void>("/api/akun/keluar", { method: "POST", token }).catch(() => undefined);
