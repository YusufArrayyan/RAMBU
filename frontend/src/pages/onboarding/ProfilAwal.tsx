/** S04 Profil singkat (ONB-03) dan penyuntingan profil dari Saya. Semua isian boleh dilewati. */
import { useState } from "react";
import { useNavigate } from "react-router";
import { IsianAngka, IsianPilih } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { Sakelar, Tombol } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { useApp } from "@/state/app";

export const ZONA = [
  { nilai: "Asia/Jakarta", label: "WIB (Jakarta)" },
  { nilai: "Asia/Makassar", label: "WITA (Makassar)" },
  { nilai: "Asia/Jayapura", label: "WIT (Jayapura)" },
];

export default function ProfilAwal({ dariSaya = false }: { dariSaya?: boolean }) {
  const { data, aksi } = useApp();
  const nav = useNavigate();
  const [penghasilan, setPenghasilan] = useState<number | null>(data.profil.penghasilan);
  const [gajian, setGajian] = useState<number | null>(data.profil.tanggalGajian);
  const [zona, setZona] = useState(ZONA.some((z) => z.nilai === data.profil.zonaWaktu) ? data.profil.zonaWaktu : "Asia/Jakarta");
  const [tidakTetap, setTidakTetap] = useState(data.profil.tidakTetap);
  const galatGajian = gajian != null && (gajian < 1 || gajian > 31) ? "Isi tanggal 1 sampai 31." : null;
  const tujuan = dariSaya ? "/saya" : "/beranda";

  const simpan = () => {
    if (galatGajian) return;
    aksi.setProfil({ penghasilan: penghasilan || null, tanggalGajian: gajian, zonaWaktu: zona, tidakTetap });
    if (!data.mode) aksi.setMode("tamu");
    catat("profile_saved", { has_income: penghasilan ? "ya" : "tidak" });
    nav(tujuan);
  };

  return (
    <Halaman
      judul={dariSaya ? "Profil penghasilan" : "Profil singkat"}
      kembali={dariSaya ? "/saya" : "/cara-pakai"}
      lebar="sempit"
      aksi={
        <div className="space-y-1">
          <Tombol blok onClick={simpan}>
            Simpan
          </Tombol>
          {!dariSaya && (
            <Tombol
              blok
              varian="teks"
              onClick={() => {
                if (!data.mode) aksi.setMode("tamu");
                nav("/beranda");
              }}
            >
              Lewati dulu
            </Tombol>
          )}
        </div>
      }
    >
      <h2 className="t-h1">Sedikit tentang penghasilanmu</h2>
      <p className="mt-1.5 text-text2">Dipakai untuk menghitung rasio cicilan terhadap penghasilan. Boleh dikosongkan dan diubah nanti.</p>
      <div className="mt-6 space-y-5">
        <IsianAngka
          label="Penghasilan per bulan"
          name="penghasilan"
          jenis="rupiah"
          nilai={penghasilan}
          onNilai={setPenghasilan}
          opsional
          petunjuk="Hanya untuk perhitungan, tidak dibagikan ke siapa pun."
        />
        <IsianAngka label="Tanggal gajian" name="gajian" jenis="bulat" nilai={gajian} onNilai={setGajian} satuan="setiap bulan" opsional galat={galatGajian} placeholder="25" />
        <IsianPilih label="Zona waktu" name="zona" nilai={zona} onNilai={setZona} pilihan={ZONA} petunjuk="Dipakai untuk jam pengingat dan tanggal jatuh tempo." />
        <div className="kartu px-4 py-2">
          <Sakelar label="Penghasilanku tidak tetap" keterangan="Kamu bisa mengisi perkiraan terendah agar hasilnya aman." nilai={tidakTetap} onNilai={setTidakTetap} />
        </div>
      </div>
    </Halaman>
  );
}
