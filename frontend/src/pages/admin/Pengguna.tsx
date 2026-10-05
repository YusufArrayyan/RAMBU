/** Pengguna admin (ADM-05): peran Penyunting, Peninjau, Analis, Superadmin, Mitra. Hanya Superadmin. */
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { IsianPilih, IsianTeks } from "@/components/Isian";
import { Lembar } from "@/components/Lembar";
import { Kartu, Lencana, Pemberitahuan, Tombol } from "@/components/ui";
import { LABEL_PERAN, panggilAdmin, type AdminPengguna, type Peran } from "@/lib/admin";
import { KepalaAdmin, Memuat, useMuat } from "./Admin";

const KETERANGAN: Record<Peran, string> = {
  penyunting: "Mengajukan parameter, menyunting konten klausul",
  peninjau: "Menyetujui dan menerbitkan (orang berbeda dari pengaju)",
  analis: "Dasbor, log pemeriksa, laporan agregat",
  superadmin: "Semua di atas dan mengelola admin",
  mitra: "Laporan agregat anonim saja (k ≥ 20)",
};

export default function PenggunaAdmin({ contoh }: { contoh: boolean }) {
  const { data, galat, muat } = useMuat<AdminPengguna[]>("/api/admin/pengguna");
  const [buka, setBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [peran, setPeran] = useState<Peran>("penyunting");
  const [hasil, setHasil] = useState<{ token: string } | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  const tambah = async () => {
    setGagal(null);
    try {
      setHasil(await panggilAdmin<{ token: string }>("/api/admin/pengguna", { method: "POST", body: JSON.stringify({ nama, email, peran }) }));
      muat();
    } catch (e) {
      setGagal((e as Error).message);
    }
  };
  const ubahAktif = async (a: AdminPengguna) => {
    try {
      await panggilAdmin(`/api/admin/pengguna/${a.id}/aktif?aktif=${!a.aktif}`, { method: "POST" });
      muat();
    } catch (e) {
      setGagal((e as Error).message);
    }
  };

  return (
    <>
      <KepalaAdmin
        judul="Pengguna admin"
        sub="Tidak ada peran, termasuk Superadmin, yang bisa membaca data personal pengguna."
        contoh={contoh}
        aksi={
          <Tombol
            kecil
            varian="kedua"
            ikon={UserPlus}
            onClick={() => {
              setHasil(null);
              setNama("");
              setEmail("");
              setBuka(true);
            }}
          >
            Tambah admin
          </Tombol>
        }
      />
      {gagal && !buka && (
        <div className="mb-4">
          <Pemberitahuan nada="red">{gagal}</Pemberitahuan>
        </div>
      )}
      {!data ? (
        <Memuat galat={galat} />
      ) : (
        <Kartu className="overflow-x-auto p-0 lg:p-0">
          <table className="w-full min-w-[44rem] text-[0.9375rem]">
            <caption className="sr-only">Pengguna admin</caption>
            <thead>
              <tr className="text-left text-sm text-muted">
                {["Nama", "Peran", "Wewenang", "Status", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-4 pt-4 pb-2 font-semibold first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((a) => (
                <tr key={a.id}>
                  <th scope="row" className="px-4 py-3 pl-5 text-left">
                    <span className="block font-bold text-ink">{a.nama}</span>
                    <span className="text-sm text-muted">{a.email}</span>
                  </th>
                  <td className="px-4 py-3 text-ink">{LABEL_PERAN[a.peran]}</td>
                  <td className="px-4 py-3 text-sm text-text2">{KETERANGAN[a.peran]}</td>
                  <td className="px-4 py-3">
                    <Lencana nada={a.aktif ? "teal" : "netral"}>{a.aktif ? "Aktif" : "Nonaktif"}</Lencana>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Tombol kecil varian={a.aktif ? "hapus" : "teks"} onClick={() => ubahAktif(a)}>
                      {a.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </Tombol>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Kartu>
      )}
      <Lembar
        buka={buka}
        onTutup={() => setBuka(false)}
        judul={hasil ? "Admin ditambahkan" : "Tambah admin"}
        kaki={hasil ? <Tombol blok onClick={() => setBuka(false)}>Selesai</Tombol> : <Tombol blok onClick={tambah}>Tambah</Tombol>}
      >
        {hasil ? (
          <div className="space-y-3">
            <p className="text-text2">Token masuk hanya ditampilkan sekali. Serahkan lewat kanal aman, lalu tutup layar ini.</p>
            <p className="rumus select-all break-all">{hasil.token}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <IsianTeks label="Nama" name="nama" nilai={nama} onNilai={setNama} maxLength={60} />
            <IsianTeks label="Email" name="email" type="email" inputMode="email" nilai={email} onNilai={setEmail} />
            <IsianPilih<Peran> label="Peran" name="peran" nilai={peran} onNilai={setPeran} pilihan={(Object.keys(LABEL_PERAN) as Peran[]).map((p) => ({ nilai: p, label: LABEL_PERAN[p] }))} petunjuk={KETERANGAN[peran]} />
            {gagal && <Pemberitahuan nada="red">{gagal}</Pemberitahuan>}
          </div>
        )}
      </Lembar>
    </>
  );
}
