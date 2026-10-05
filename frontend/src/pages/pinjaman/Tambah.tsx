/** S17 Tambah pinjaman (PIN-02, PIN-03): jadwal bulanan dibuat dari sedikit isian. */
import { CircleCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { IsianAngka, IsianTeks } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, Lencana, Tombol } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { rupiah } from "@/lib/format";
import { buatJadwal, hariIni, tambahHari, tglPanjang } from "@/lib/jadwal";
import { useApp } from "@/state/app";
import { useAlur } from "@/state/flow";

export default function Tambah() {
  const { aksi } = useApp();
  const { utama, alur, mulaiUlang } = useAlur();
  const nav = useNavigate();
  const toast = useToast();
  const [cari] = useSearchParams();
  const h = cari.get("dari") === "cek" ? utama.hasil : null;
  const awal = useMemo(
    () => ({
      nama: h ? utama.nama.replace(/ \(contoh\)$/, "") : "",
      per: h ? Math.round(h.cicilan) : null,
      n: h ? h.jumlahCicilan : null,
      pertama: h ? tambahHari(hariIni(), Math.min(30, alur.tenor ?? 30)) : "",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nama, setNama] = useState(awal.nama);
  const [penyelenggara, setPenyelenggara] = useState("");
  const [per, setPer] = useState<number | null>(awal.per);
  const [n, setN] = useState<number | null>(awal.n);
  const [pertama, setPertama] = useState(awal.pertama);
  const [coba, setCoba] = useState(false);

  const galat = {
    per: !per || per <= 0 ? "Isi cicilan per kali." : null,
    n: !n || n < 1 ? "Isi jumlah cicilan, minimal 1." : n > 120 ? "Maksimal 120 cicilan." : null,
    pertama: !pertama ? "Pilih tanggal jatuh tempo pertama." : null,
  };
  // Bila isian sama dengan hasil Cek, total dari mesin dipakai agar selisih pembulatan ditanggung cicilan terakhir.
  const pakaiTotal = h && per === awal.per && n === awal.n ? h.total : undefined;
  const pratinjau = !galat.per && !galat.n && !galat.pertama ? buatJadwal({ cicilanPerKali: per!, jumlahCicilan: n!, jatuhTempoPertama: pertama, total: pakaiTotal }) : [];
  const total = pratinjau.reduce((s, c) => s + c.jumlah, 0);

  const simpan = () => {
    setCoba(true);
    if (galat.per || galat.n || galat.pertama) return;
    const id = aksi.tambahPinjaman({
      nama,
      penyelenggara,
      cicilanPerKali: per!,
      jumlahCicilan: n!,
      jatuhTempoPertama: pertama,
      total: pakaiTotal,
      asal: h ? "putuskan" : "manual",
      cek: h
        ? {
            pokok: alur.pokok!,
            tenor: alur.tenor!,
            bungaHarianPersen: utama.bungaHarianPersen!,
            adminPersen: utama.adminPersen!,
            diterima: h.diterima,
            total: h.total,
            biaya: h.biaya,
            efektifHarianPersen: h.efektifHarianPersen,
            versiParameter: h.versiParameter,
          }
        : undefined,
    });
    catat("loan_added", { sumber: h ? "putuskan" : "manual" });
    if (h) mulaiUlang();
    toast("Pinjaman disimpan. Jadwal dan pengingatnya sudah dibuat.");
    nav(`/pinjamanku/${id}`, { replace: true });
  };

  return (
    <Halaman
      judul="Tambah pinjaman"
      kembali={true}
      lebar="sempit"
      aksi={
        <div className="space-y-1">
          <Tombol blok onClick={simpan}>
            Simpan pinjaman
          </Tombol>
          <Tombol blok varian="teks" onClick={() => nav(-1)}>
            Kembali
          </Tombol>
        </div>
      }
    >
      {h && (
        <Lencana nada="teal" ikon={CircleCheck} className="mb-4">
          Disalin dari hasil Cek
        </Lencana>
      )}
      <div className="space-y-5">
        <IsianTeks label="Nama pinjaman" name="nama" nilai={nama} onNilai={setNama} placeholder="mis. Pinjaman motor…" maxLength={40} petunjuk="Nama bebas. Nama penyelenggara tidak wajib." />
        <IsianTeks label="Penyelenggara" name="penyelenggara" nilai={penyelenggara} onNilai={setPenyelenggara} maxLength={40} opsional petunjuk="Hanya untuk catatanmu. Tidak pernah dikirim ke penyelenggara." />
        <IsianAngka label="Cicilan per kali" name="per" jenis="rupiah" nilai={per} onNilai={setPer} galat={coba ? galat.per : null} />
        <IsianAngka label="Jumlah cicilan" name="n" jenis="bulat" satuan="kali" nilai={n} onNilai={setN} galat={coba ? galat.n : null} />
        <IsianTeks label="Jatuh tempo pertama" name="pertama" type="date" nilai={pertama} onNilai={setPertama} galat={coba ? galat.pertama : null} petunjuk="Diulang tiap bulan di tanggal yang sama." />
      </div>

      {pratinjau.length > 0 && (
        <Kartu className="mt-6" aria-labelledby="pratinjau">
          <h2 id="pratinjau" className="label-kartu">
            Jadwal yang akan dibuat
          </h2>
          <ul className="mt-2 space-y-1.5">
            {pratinjau.slice(0, 6).map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span className="text-text2">{tglPanjang(c.jatuhTempo)}</span>
                <span className="angka font-bold text-ink">{rupiah(c.jumlah)}</span>
              </li>
            ))}
            {pratinjau.length > 6 && <li className="text-sm text-muted">… dan {pratinjau.length - 6} cicilan lagi</li>}
          </ul>
          <div className="mt-3 flex justify-between gap-3 border-t border-line pt-3">
            <span className="text-text2">Total</span>
            <span className="angka font-bold text-ink">{rupiah(total)}</span>
          </div>
        </Kartu>
      )}
      <p className="mt-4 text-sm text-muted">Tanggal jatuh tempo bisa kamu ubah per cicilan nanti. Jadwal ini catatanmu, bukan data penyelenggara: cocokkan dengan aplikasi pinjamanmu.</p>
    </Halaman>
  );
}
