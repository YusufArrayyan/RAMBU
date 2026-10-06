/** S25 Saya (ACC-05, ACC-06): akun, tampilan, dan data. */
import { Bell, BookOpen, Check, ChevronRight, Download, FileUp, Heart, LogOut, Palette, ShieldCheck, SlidersHorizontal, Trash2, UserPlus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Lembar } from "@/components/Lembar";
import { Halaman, useTema, type Tema } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, Lencana, Sakelar, Segmented, TautanTombol, Tombol } from "@/components/ui";
import { hapusAkunServer, keluarServer } from "@/lib/akun";
import { matikanPush } from "@/lib/push";
import { analitikDimatikan, aturAnalitik, catat, sinyalPrivasiPeramban } from "@/lib/analytics";
import { rupiah } from "@/lib/format";
import { versiAktif } from "@/lib/regulasi";
import { eksporCsv, eksporJson, unduhTeks, useApp, type DataApp } from "@/state/app";

function Menu({ ke, ikon: Ikon, judul, sub }: { ke: string; ikon: typeof Bell; judul: string; sub?: string }) {
  return (
    <li>
      <Link to={ke} className="flex min-h-16 items-center gap-4 rounded-xl px-2 py-2 hover:bg-sunken">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-text2">
          <Ikon aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{judul}</span>
          {sub && <span className="block truncate text-sm text-text2">{sub}</span>}
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <Kartu aria-label={judul}>
      <h2 className="t-h2">{judul}</h2>
      <div className="mt-3">{children}</div>
    </Kartu>
  );
}

export default function Saya() {
  const { data, aksi } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [tema, setTema] = useTema();
  const [hapus, setHapus] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [analitik, setAnalitik] = useState(!analitikDimatikan());
  const fileRef = useRef<HTMLInputElement>(null);
  const akun = data.mode === "akun" && data.akun;
  const p = data.profil;
  const reg = versiAktif();

  const ekspor = (jenis: "json" | "csv") => {
    if (jenis === "json") unduhTeks(eksporJson(data), "datamu-rambu.json", "application/json");
    else unduhTeks(eksporCsv(data), "jadwal-cicilan-rambu.csv", "text/csv;charset=utf-8");
    catat("export_data", {});
  };

  const impor = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as DataApp;
      if (d.versi !== 4 || !Array.isArray(d.pinjaman)) throw new Error();
      aksi.gantiSemua({ ...d, akun: data.akun, mode: data.mode });
      toast(`${d.pinjaman.length} pinjaman dipulihkan dari berkas.`);
    } catch {
      toast("Berkas tidak dikenali. Pakai berkas datamu-rambu.json dari Ekspor datamu.");
    }
  };

  const hapusSemua = async () => {
    setSibuk(true);
    try {
      if (akun) {
        await matikanPush(null);
        await hapusAkunServer(data.akun!.token);
      }
      catat("delete_account", {});
      aksi.hapusSemua();
      setHapus(false);
      nav("/selamat-datang", { replace: true });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Halaman judul="Saya" lebar="lebar" judulVisual={<h1 className="t-h1">Saya</h1>}>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          <Kartu>
            {akun ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-ink">{data.akun!.email}</p>
                  <p className="text-text2">Akun aktif · {data.pengingat.push || data.pengingat.email ? "pengingat server menyala" : "pengingat server mati"}</p>
                </div>
                <Lencana nada="teal" ikon={Check}>
                  Akun
                </Lencana>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-ink">Mode tamu</p>
                    <p className="text-text2">Data hanya ada di perangkat ini dan hilang bila data peramban dihapus.</p>
                  </div>
                  <Lencana>Tamu</Lencana>
                </div>
                <TautanTombol to="/masuk?baru=1" varian="kedua" ikon={UserPlus} className="mt-4">
                  Buat akun untuk pengingat dan cadangan
                </TautanTombol>
              </>
            )}
          </Kartu>

          <Kartu className="p-2 lg:p-2">
            <ul>
              <Menu ke="/saya/profil" ikon={SlidersHorizontal} judul="Profil penghasilan" sub={p.penghasilan ? `${rupiah(p.penghasilan)}${p.tanggalGajian ? ` · gajian tanggal ${p.tanggalGajian}` : ""}` : "Belum diisi"} />
              <Menu ke="/saya/pengingat" ikon={Bell} judul="Pengingat" sub={akun ? (data.pengingat.push ? "Notifikasi aktif" : data.pengingat.email ? "Email aktif" : "Banner dan kalender") : "Banner dan file kalender"} />
              <Menu ke="/cara-hitung" ikon={BookOpen} judul="Cara RAMBU menghitung" sub={`Versi parameter ${reg.id}`} />
              <Menu ke="/bantuan?dari=saya" ikon={Heart} judul="Butuh bantuan" />
              <Menu ke="/privasi" ikon={ShieldCheck} judul="Ringkasan privasi" />
              <Menu ke="/desain" ikon={Palette} judul="Sistem desain" sub="Token dan komponen" />
            </ul>
          </Kartu>
        </div>

        <div className="space-y-4">
          <Bagian judul="Tampilan">
            <Segmented<Tema>
              label="Tampilan"
              nilai={tema}
              onNilai={setTema}
              pilihan={[
                { nilai: "terang", label: "Terang" },
                { nilai: "gelap", label: "Gelap" },
                { nilai: "sistem", label: "Sistem" },
              ]}
            />
          </Bagian>

          <Bagian judul="Datamu">
            <p className="text-text2">
              {akun
                ? "Yang disimpan di akun: jadwal cicilan dan pengaturan pengingat. Nama pemberi pinjaman dan jumlah hanya bila kamu mengisinya. Tidak dibagikan ke penyelenggara."
                : "Semua data ada di perangkat ini. Tidak ada data keuangan yang dikirim ke server mana pun."}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Tombol varian="kedua" ikon={Download} onClick={() => ekspor("json")}>
                Ekspor datamu (JSON)
              </Tombol>
              <Tombol varian="kedua" ikon={Download} onClick={() => ekspor("csv")}>
                Jadwal (CSV)
              </Tombol>
            </div>
            {!akun && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) impor(f);
                    e.target.value = "";
                  }}
                />
                <Tombol varian="teks" ikon={FileUp} className="mt-1 -ml-3" onClick={() => fileRef.current?.click()}>
                  Pulihkan dari berkas (pindah perangkat)
                </Tombol>
              </>
            )}
            <div className="mt-3 border-t border-line pt-3">
              <Sakelar
                label="Kirim statistik anonim"
                keterangan={sinyalPrivasiPeramban() ? "Dimatikan oleh sinyal privasi perambanmu." : "Hanya nama peristiwa, tanpa nilai uang, nama, atau teks."}
                nilai={analitik && !sinyalPrivasiPeramban()}
                disabled={sinyalPrivasiPeramban()}
                onNilai={(v) => {
                  aturAnalitik(v);
                  setAnalitik(v);
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-2 border-t border-line pt-3">
              <Tombol varian="hapus" ikon={Trash2} onClick={() => setHapus(true)}>
                {akun ? "Hapus akun dan semua data" : "Hapus data di perangkat ini"}
              </Tombol>
              {akun && (
                <Tombol
                  varian="teks"
                  ikon={LogOut}
                  onClick={async () => {
                    if (data.pengingat.push) await matikanPush(null); // langganan server dicabut oleh /keluar
                    await keluarServer(data.akun!.token);
                    const pulih = aksi.keluarAkun();
                    toast(pulih ? "Kamu keluar. Data tamu sebelumnya dipulihkan di perangkat ini." : "Kamu keluar. Data tetap ada di perangkat ini sebagai tamu; cadangannya tetap di akunmu.");
                  }}
                >
                  Keluar
                </Tombol>
              )}
            </div>
          </Bagian>
        </div>
      </div>

      <Lembar
        buka={hapus}
        onTutup={() => setHapus(false)}
        judul={akun ? "Hapus akun dan semua data?" : "Hapus data di perangkat ini?"}
        kaki={
          <div className="grid grid-cols-2 gap-2">
            <Tombol varian="kedua" onClick={() => setHapus(false)}>
              Batal
            </Tombol>
            <Tombol varian="kedua" className="border-red text-red hover:bg-red-soft" onClick={hapusSemua} disabled={sibuk}>
              {sibuk ? "Menghapus…" : "Hapus"}
            </Tombol>
          </div>
        }
      >
        <p className="text-text2">
          {akun
            ? "Akun, jadwal cicilan, catatan bayar, pengaturan pengingat, dan token notifikasi dihapus dari server, lalu data di perangkat ini juga dihapus. Ini tidak bisa dibatalkan."
            : `${data.pinjaman.length} pinjaman, profil, dan pengaturan di perangkat ini dihapus. Ini tidak bisa dibatalkan.`}{" "}
          Unduh ekspor dulu bila ingin menyimpan salinan.
        </p>
      </Lembar>
    </Halaman>
  );
}
