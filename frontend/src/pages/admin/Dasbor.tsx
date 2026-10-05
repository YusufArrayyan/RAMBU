/** A01 Dasbor admin: tanpa isi dokumen atau obrolan pengguna. */
import { GrafikBatang } from "@/components/Bilah";
import { Kartu, Lencana, type Nada } from "@/components/ui";
import { AKSI, type Dasbor as D } from "@/lib/admin";
import { persen } from "@/lib/format";
import { HARI, dariIso, tglPendek } from "@/lib/jadwal";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";

export const STATUS_ADMIN: Record<string, { label: string; nada: Nada }> = {
  terbit: { label: "Terbit", nada: "teal" },
  menunggu: { label: "Menunggu", nada: "amber" },
  ditinjau: { label: "Ditinjau", nada: "amber" },
  draf: { label: "Draf", nada: "netral" },
  ditolak: { label: "Ditolak", nada: "red" },
  nonaktif: { label: "Nonaktif", nada: "netral" },
  arsip: { label: "Arsip", nada: "netral" },
  terverifikasi: { label: "Terverifikasi", nada: "teal" },
  asumsi: { label: "Asumsi", nada: "amber" },
  perlu_data: { label: "Perlu data", nada: "amber" },
};

export function LencanaAdmin({ status }: { status: string }) {
  const s = STATUS_ADMIN[status] ?? { label: status, nada: "netral" as Nada };
  return <Lencana nada={s.nada}>{s.label}</Lencana>;
}

function statusAktivitas(aksi: string) {
  if (aksi.includes("terbit")) return "terbit";
  if (aksi.includes("ajukan") || aksi.includes("ditinjau")) return "menunggu";
  if (aksi.includes("tolak")) return "ditolak";
  return "draf";
}

export function waktu(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Angka({ label, nilai, sub, nada }: { label: string; nilai: string; sub: string; nada?: "amber" }) {
  return (
    <Kartu as="div">
      <p className="label-kartu">{label}</p>
      <p className={`angka mt-1 text-[34px] leading-[40px] font-extrabold tracking-tight ${nada === "amber" ? "text-amber" : "text-ink"}`}>{nilai}</p>
      <p className="mt-1 text-sm text-text2">{sub}</p>
    </Kartu>
  );
}

export default function Dasbor() {
  const { data, galat } = useMuat<D>("/api/admin/dasbor");
  return (
    <>
      <KepalaAdmin judul="Dasbor" sub="Ringkasan kesehatan sistem. Tidak ada isi dokumen atau obrolan pengguna." contoh={data?.data_contoh} />
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Angka label="Versi parameter aktif" nilai={data.versi_aktif.id} sub={data.versi_aktif.diterbitkan ? `Diterbitkan ${tglPendek(data.versi_aktif.diterbitkan)} ${data.versi_aktif.diterbitkan.slice(0, 4)}` : "Dari berkas konfigurasi"} />
            <Angka label="Menunggu peninjau" nilai={String(data.menunggu.jumlah)} sub={data.menunggu.terbaru ?? "Tidak ada perubahan menunggu"} nada={data.menunggu.jumlah ? "amber" : undefined} />
            <Angka
              label="Keluaran AI ditolak"
              nilai={`${data.ai_ditolak.ditolak} dari ${data.ai_ditolak.total}`}
              sub={`7 hari terakhir${data.ai_ditolak.total ? ` (${persen((data.ai_ditolak.ditolak / data.ai_ditolak.total) * 100)})` : ""}`}
            />
            <Angka label="Uji paham selesai" nilai={data.uji_paham.proporsi === null ? "-" : persen(data.uji_paham.proporsi * 100, 0)} sub="dari sesi yang menyelesaikan Cek" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Kartu aria-labelledby="tolak">
              <h2 id="tolak" className="t-h2">
                Keluaran AI ditolak pemeriksa per hari
              </h2>
              <div className="mt-8">
                <GrafikBatang
                  label="Keluaran AI ditolak per hari"
                  data={data.penolakan_per_hari.map((p) => ({ label: HARI[dariIso(p.tanggal).getDay()].slice(0, 3), nilai: p.ditolak }))}
                  tinggi={200}
                />
              </div>
              <p className="mt-4 text-sm text-text2">{data.penyebab_terbanyak ? `Penyebab terbanyak: ${data.penyebab_terbanyak}.` : "Belum ada penolakan."}</p>
            </Kartu>
            <Kartu aria-labelledby="aktivitas">
              <h2 id="aktivitas" className="t-h2">
                Aktivitas terbaru
              </h2>
              {data.aktivitas.length === 0 ? (
                <p className="mt-3 text-text2">Belum ada aktivitas.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {data.aktivitas.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {AKSI[a.aksi] ?? a.aksi}: {a.objek}
                        </p>
                        <p className="text-sm text-muted">
                          {a.aktor} · {waktu(a.waktu)}
                        </p>
                      </div>
                      <LencanaAdmin status={statusAktivitas(a.aksi)} />
                    </li>
                  ))}
                </ul>
              )}
            </Kartu>
          </div>
        </div>
      )}
    </>
  );
}
