/** A04 Log pemeriksa (ADM-04): jenis, hasil, alasan, kode acak. Tanpa isi pengguna. */
import { Lock } from "lucide-react";
import { useState } from "react";
import { IsianPilih } from "@/components/Isian";
import { Kartu, Lencana } from "@/components/ui";
import { JENIS_LOG, type LogPemeriksa as L } from "@/lib/admin";
import { persen } from "@/lib/format";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";
import { waktu } from "./Dasbor";

export default function LogPemeriksa({ contoh }: { contoh: boolean }) {
  const [jenis, setJenis] = useState("");
  const [hasil, setHasil] = useState("");
  const [hari, setHari] = useState("7");
  const { data, galat } = useMuat<L>(`/api/admin/log-pemeriksa?jenis=${jenis}&hasil=${hasil}&hari=${hari}`);
  return (
    <>
      <KepalaAdmin judul="Log pemeriksa" sub="Pemeriksa kode menilai setiap keluaran AI sebelum ditampilkan." contoh={contoh} />
      <div className="kartu-catatan mb-5 flex items-center gap-3 px-4 py-3">
        <Lock aria-hidden className="size-5 shrink-0 text-muted" />
        <p className="text-text2">Log hanya memuat jenis, hasil, alasan, dan kode acak. Isi dokumen dan obrolan tidak disimpan.</p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <IsianPilih label="Jenis" name="jenis" nilai={jenis} onNilai={setJenis} pilihan={[{ nilai: "", label: "Semua jenis" }, ...Object.entries(JENIS_LOG).map(([nilai, label]) => ({ nilai, label }))]} />
        <IsianPilih
          label="Hasil"
          name="hasil"
          nilai={hasil}
          onNilai={setHasil}
          pilihan={[
            { nilai: "", label: "Semua hasil" },
            { nilai: "lolos", label: "Lolos" },
            { nilai: "ditolak", label: "Ditolak" },
          ]}
        />
        <IsianPilih
          label="Rentang"
          name="hari"
          nilai={hari}
          onNilai={setHari}
          pilihan={[
            { nilai: "7", label: "7 hari terakhir" },
            { nilai: "30", label: "30 hari terakhir" },
            { nilai: "90", label: "90 hari terakhir" },
          ]}
        />
      </div>
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kartu as="div">
              <p className="label-kartu">Ditolak</p>
              <p className="angka mt-1 text-[34px] leading-[40px] font-extrabold text-ink">{data.ringkas.total ? persen((data.ringkas.ditolak / data.ringkas.total) * 100) : "0%"}</p>
              <p className="text-sm text-text2">
                {data.ringkas.ditolak} dari {data.ringkas.total} keluaran
              </p>
            </Kartu>
            {data.ringkas.per_alasan.slice(0, 2).map((a) => (
              <Kartu as="div" key={a.alasan}>
                <p className="label-kartu first-letter:uppercase">{a.alasan}</p>
                <p className="angka mt-1 text-[34px] leading-[40px] font-extrabold text-ink">{a.jumlah}</p>
                <p className="text-sm text-text2">penolakan</p>
              </Kartu>
            ))}
          </div>
          <Kartu className="overflow-x-auto p-0 lg:p-0" tabIndex={0} aria-label="Tabel log pemeriksa">
            <table className="w-full min-w-[44rem] text-[0.9375rem]">
              <caption className="sr-only">Log pemeriksa</caption>
              <thead>
                <tr className="text-left text-sm text-muted">
                  {["Waktu", "Jenis", "Hasil", "Alasan", "Kode"].map((h) => (
                    <th key={h} scope="col" className="px-4 pt-4 pb-2 font-semibold first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.baris.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-text2">
                      Tidak ada baris untuk saringan ini.
                    </td>
                  </tr>
                )}
                {data.baris.slice(0, 100).map((b) => (
                  <tr key={b.kode + b.waktu}>
                    <td className="px-4 py-3 pl-5 font-semibold whitespace-nowrap text-ink">{waktu(b.waktu)}</td>
                    <td className="px-4 py-3 text-text2">{JENIS_LOG[b.jenis] ?? b.jenis}</td>
                    <td className="px-4 py-3">
                      <Lencana nada={b.hasil === "lolos" ? "teal" : "red"}>{b.hasil === "lolos" ? "Lolos" : "Ditolak"}</Lencana>
                    </td>
                    <td className="px-4 py-3 text-text2 first-letter:uppercase">{b.alasan || "-"}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted">#{b.kode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Kartu>
          {data.baris.length > 100 && <p className="text-sm text-muted">Menampilkan 100 baris terbaru dari {data.baris.length}.</p>}
        </div>
      )}
    </>
  );
}
