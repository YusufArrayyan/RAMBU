/** S22 Atur pengingat (ING-01, ING-03 s.d. ING-07, XAI-07). */
import { Download, Info, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { IsianPilih, IsianTeks } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Chip, Kartu, Pemberitahuan, Sakelar, TautanTombol, Tombol } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { buatIcs, unduhIcs } from "@/lib/ics";
import { aktifkanPush, matikanPush } from "@/lib/push";
import { LABEL_OFFSET, SEMUA_OFFSET, type Offset } from "@/lib/pengingat";
import { useApp } from "@/state/app";
import { useKonfig } from "@/state/config";

function perluPetunjukIos() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const terpasang = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  return ios && !terpasang;
}

export default function Pengingat() {
  const { data, aksi } = useApp();
  const { pushTersedia } = useKonfig();
  const toast = useToast();
  const a = data.pengingat;
  const akun = data.mode === "akun";
  const ios = useMemo(perluPetunjukIos, []);

  const set = (p: Partial<typeof a>) => {
    aksi.setPengingat(p);
    if (p.offsets) catat("reminder_enabled", { aturan: p.offsets.map((o) => LABEL_OFFSET[o]).join(" ") || "tidak_ada" });
  };
  const toggleOffset = (o: Offset) => set({ offsets: a.offsets.includes(o) ? a.offsets.filter((x) => x !== o) : [...a.offsets, o].sort((x, y) => x - y) });

  const [sibukPush, setSibukPush] = useState(false);
  const nyalakanPush = async (v: boolean) => {
    const token = data.akun?.token ?? null;
    setSibukPush(true);
    try {
      if (!v) {
        await matikanPush(token);
        set({ push: false });
        toast("Notifikasi dimatikan di perangkat ini.");
      } else {
        await aktifkanPush(token!);
        set({ push: true });
        toast("Notifikasi menyala. Pengingat sampai walau RAMBU tertutup.");
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSibukPush(false);
    }
  };

  return (
    <Halaman judul="Atur pengingat" kembali="/saya">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          {ios && akun && (
            <Pemberitahuan nada="amber" ikon={Smartphone}>
              Di iPhone, tambahkan RAMBU ke Layar Utama (Bagikan, lalu Tambah ke Layar Utama) agar notifikasi bisa masuk. Email tetap dipakai sebagai cadangan.
            </Pemberitahuan>
          )}
          {!akun && (
            <Pemberitahuan nada="amber" ikon={Info}>
              Kamu memakai mode tamu: pengingat muncul sebagai banner saat RAMBU dibuka dan lewat file kalender. Tidak ada notifikasi saat aplikasi tertutup.{" "}
              <Link to="/masuk?baru=1" className="font-bold underline underline-offset-2">
                Buat akun
              </Link>{" "}
              untuk notifikasi dan email.
            </Pemberitahuan>
          )}

          <Kartu className="px-5 py-3 lg:px-6 lg:py-3">
            <Sakelar
              label="Notifikasi"
              keterangan={
                !akun
                  ? "Butuh akun."
                  : !pushTersedia
                    ? "Belum dikonfigurasi di server ini. Email dipakai."
                    : "Notification" in window && Notification.permission === "denied"
                      ? "Izin notifikasi diblokir di peramban ini. Izinkan lewat pengaturan situs, lalu nyalakan lagi."
                      : "Dikirim server, tetap sampai walau aplikasi tertutup."
              }
              nilai={akun && a.push}
              onNilai={nyalakanPush}
              disabled={!akun || !pushTersedia || sibukPush}
            />
            <div className="border-t border-line" />
            <Sakelar label="Email" keterangan={akun ? `Ke ${data.akun?.email}. Cadangan bila notifikasi mati.` : "Butuh akun."} nilai={akun && a.email} onNilai={(v) => set({ email: v })} disabled={!akun} />
            <div className="border-t border-line" />
            <Sakelar label="Banner dalam aplikasi" keterangan="Selalu menyala saat RAMBU dibuka." nilai onNilai={() => {}} disabled />
          </Kartu>

          <Kartu aria-labelledby="kapan">
            <h2 id="kapan" className="t-h2">
              Kapan diingatkan
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEMUA_OFFSET.map((o) => (
                <Chip key={o} terpilih={a.offsets.includes(o)} onClick={() => toggleOffset(o)}>
                  {LABEL_OFFSET[o]}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">Pengingat berhenti sendiri setelah cicilan ditandai dibayar. Setelah H+3 tidak ada pengingat lagi untuk cicilan itu.</p>
            <div className="mt-4 border-t border-line pt-3">
              <Sakelar label="Pengingat tanggal gajian" keterangan={data.profil.tanggalGajian ? `Tanggal ${data.profil.tanggalGajian}: total cicilan bulan ini, tanpa saran.` : "Isi tanggal gajian di profil dulu."} nilai={a.gajian} onNilai={(v) => set({ gajian: v })} disabled={!data.profil.tanggalGajian} />
            </div>
          </Kartu>
        </div>

        <div className="space-y-4">
          <Kartu aria-labelledby="jam">
            <h2 id="jam" className="t-h2">
              Jam dan batas
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <IsianTeks label="Jam kirim" name="jam" type="time" nilai={a.jamKirim} onNilai={(v) => v && set({ jamKirim: v })} />
              <IsianPilih
                label="Maksimal per hari"
                name="maks"
                nilai={String(a.maksPerHari)}
                onNilai={(v) => set({ maksPerHari: Number(v) })}
                pilihan={[1, 2, 3, 4, 5].map((n) => ({ nilai: String(n), label: `${n} pengingat` }))}
              />
              <IsianTeks label="Jam tenang mulai" name="tenang-mulai" type="time" nilai={a.jamTenangMulai} onNilai={(v) => v && set({ jamTenangMulai: v })} />
              <IsianTeks label="Jam tenang selesai" name="tenang-selesai" type="time" nilai={a.jamTenangSelesai} onNilai={(v) => v && set({ jamTenangSelesai: v })} />
            </div>
            <p className="mt-3 text-sm text-muted">Pengingat yang jatuh di jam tenang ditunda sampai jam tenang selesai. Beberapa cicilan di hari yang sama digabung jadi satu.</p>
          </Kartu>

          <Kartu>
            <Sakelar label="Sembunyikan jumlah di layar kunci" keterangan="Pengingat hanya menyebut tanggal." nilai={a.privasi} onNilai={(v) => set({ privasi: v })} />
            <Link to="/saya/notifikasi" className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-teal hover:underline">
              <Info aria-hidden className="size-4" /> Kenapa pengingat ini muncul?
            </Link>
          </Kartu>

          <div className="grid gap-2 sm:grid-cols-2">
            <Tombol
              varian="kedua"
              ikon={Download}
              disabled={!data.pinjaman.length}
              onClick={() => {
                unduhIcs(buatIcs(data.pinjaman, { privasi: a.privasi, offsetsAlarm: a.offsets }));
                toast("Berkas kalender diunduh.");
              }}
            >
              Ekspor ke kalender
            </Tombol>
            <TautanTombol to="/saya/notifikasi" varian="kedua">
              Lihat contoh pengingat
            </TautanTombol>
          </div>
        </div>
      </div>
    </Halaman>
  );
}
