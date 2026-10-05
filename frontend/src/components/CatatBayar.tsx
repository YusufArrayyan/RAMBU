/** S19 Catat bayar (PIN-06): menandai cicilan agar pengingat berhenti. RAMBU tidak memproses pembayaran. */
import { useEffect, useState } from "react";
import { IsianAngka, IsianTeks } from "./Isian";
import { Lembar } from "./Lembar";
import { Segmented, Tombol } from "./ui";
import { catat } from "@/lib/analytics";
import { rupiah } from "@/lib/format";
import { hariIni, tglPanjang, type InfoCicilan, type JenisBayar } from "@/lib/jadwal";
import { useApp } from "@/state/app";

export interface TargetBayar {
  pinjamanId: string;
  info: InfoCicilan;
}

export function LembarCatatBayar({ target, onTutup, onSelesai }: { target: TargetBayar | null; onTutup: () => void; onSelesai?: (pesan: string) => void }) {
  const { aksi } = useApp();
  const [jumlah, setJumlah] = useState<number | null>(null);
  const [tanggal, setTanggal] = useState(hariIni());
  const [jenis, setJenis] = useState<JenisBayar>("penuh");
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setJumlah(Math.round(target.info.sisa));
    setTanggal(hariIni());
    setJenis("penuh");
    setGalat(null);
  }, [target]);

  const sisa = target ? Math.round(target.info.sisa) : 0;

  const simpan = () => {
    if (!target) return;
    const n = jenis === "dinegosiasikan" ? (jumlah ?? 0) : jumlah;
    if (jenis !== "dinegosiasikan" && (!n || n <= 0)) return setGalat("Isi jumlah yang kamu bayar.");
    if (jenis === "sebagian" && n! >= sisa) return setGalat(`Untuk bayar sebagian, jumlah harus kurang dari ${rupiah(sisa)}. Pilih Penuh bila sudah lunas.`);
    if (!tanggal) return setGalat("Isi tanggal bayar.");
    const nilai = jenis === "penuh" ? Math.max(n!, sisa) : n!;
    aksi.catatBayar(target.pinjamanId, { cicilanId: target.info.cicilan.id, tanggal, jumlah: nilai, jenis });
    catat("payment_marked", { jenis, terlambat: tanggal > target.info.cicilan.jatuhTempo ? "ya" : "tidak" });
    onSelesai?.(
      jenis === "penuh"
        ? "Cicilan ditandai dibayar. Pengingat untuk cicilan ini berhenti."
        : jenis === "sebagian"
          ? `Bayar sebagian dicatat. Sisa ${rupiah(sisa - nilai)} tetap di jadwal.`
          : "Ditandai sedang mencari keringanan. Pengingat tetap berjalan sampai cicilan ditandai dibayar.",
    );
    onTutup();
  };

  return (
    <Lembar
      buka={!!target}
      onTutup={onTutup}
      judul="Catat pembayaran"
      kaki={
        <div className="space-y-1">
          <Tombol blok onClick={simpan}>
            {jenis === "dinegosiasikan" ? "Simpan catatan" : "Tandai sudah dibayar"}
          </Tombol>
          <Tombol blok varian="teks" onClick={onTutup}>
            Batal
          </Tombol>
        </div>
      }
    >
      {target && (
        <div className="space-y-4">
          <p className="text-text2">
            Cicilan {target.info.cicilan.ke} · jatuh tempo {tglPanjang(target.info.cicilan.jatuhTempo)}
            {target.info.dibayar > 0 && <> · sudah dibayar {rupiah(target.info.dibayar)}</>}
          </p>
          <Segmented
            label="Jenis pembayaran"
            nilai={jenis}
            onNilai={(v) => {
              setJenis(v);
              setGalat(null);
              if (v === "penuh") setJumlah(sisa);
            }}
            pilihan={[
              { nilai: "penuh", label: "Penuh" },
              { nilai: "sebagian", label: "Sebagian" },
              { nilai: "dinegosiasikan", label: "Dinegosiasikan" },
            ]}
          />
          {jenis !== "dinegosiasikan" ? (
            <IsianAngka label="Jumlah dibayar" name="jumlah" jenis="rupiah" nilai={jumlah} onNilai={setJumlah} galat={galat} />
          ) : (
            <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-text2">
              Tandai bila kamu sedang membicarakan keringanan dengan pemberi pinjaman. Ini catatan pribadimu; RAMBU tidak menghubungi siapa pun.
            </p>
          )}
          <IsianTeks label="Tanggal bayar" name="tanggal" type="date" nilai={tanggal} onNilai={setTanggal} />
          {jenis === "dinegosiasikan" && galat && <p className="text-sm font-medium text-red">{galat}</p>}
          <p className="text-sm text-muted">RAMBU tidak memproses pembayaran. Ini hanya catatan agar pengingatmu berhenti.</p>
        </div>
      )}
    </Lembar>
  );
}
