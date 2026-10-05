/**
 * S03 Masuk tanpa kata sandi (ACC-01, ACC-04, ACC-08). Tautan sekali pakai 15 menit dengan
 * cadangan kode 6 digit. Pernyataan usia 18+ wajib saat membuat akun.
 */
import { MailCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { IsianTeks } from "@/components/Isian";
import { Halaman } from "@/components/Shell";
import { Kartu, KotakCentang, Pemberitahuan, Tombol } from "@/components/ui";
import { ambilData, kirimTautan, verifikasi, GalatAkun } from "@/lib/akun";
import { useApp } from "@/state/app";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function KotakKode({ nilai, onNilai }: { nilai: string; onNilai: (s: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digit = nilai.padEnd(6, " ").slice(0, 6).split("");
  const set = (i: number, d: string) => {
    const arr = nilai.padEnd(6, " ").split("");
    arr[i] = d || " ";
    onNilai(arr.join("").replace(/\s+$/, ""));
  };
  return (
    <fieldset>
      <legend className="sr-only">Kode 6 digit</legend>
      <div className="flex gap-2">
        {digit.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            value={d.trim()}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v.length > 1) {
                onNilai(v.slice(0, 6));
                refs.current[Math.min(5, v.length)]?.focus();
                return;
              }
              set(i, v);
              if (v && i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus();
            }}
            className="isian h-14 w-full min-w-0 px-0 text-center text-xl font-bold"
          />
        ))}
      </div>
    </fieldset>
  );
}

export default function Masuk() {
  const { data, aksi } = useApp();
  const nav = useNavigate();
  const [cari] = useSearchParams();
  const [email, setEmail] = useState(data.akun?.email ?? "");
  const [usia, setUsia] = useState(false);
  const [galatEmail, setGalatEmail] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);
  const [kodeDev, setKodeDev] = useState<string | null>(null);
  const [kode, setKode] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [tawarBawa, setTawarBawa] = useState<{ token: string; email: string } | null>(null);

  const selesaiMasuk = async (token: string, alamat: string, bawaLokal: boolean | null) => {
    const lokalAda = data.pinjaman.length > 0 || data.profil.penghasilan != null;
    if (bawaLokal === null && lokalAda) {
      setTawarBawa({ token, email: alamat });
      return;
    }
    let server = null;
    try {
      server = await ambilData(token);
    } catch {
      /* server kosong atau tidak terhubung */
    }
    const akun = { email: alamat, token, sejak: new Date().toISOString() };
    if (!bawaLokal && lokalAda) aksi.sisihkanDataTamu();
    if (!bawaLokal && server && (server.pinjaman.length || server.profil)) {
      aksi.gantiSemua({ ...data, mode: "akun", akun, profil: server.profil ?? data.profil, pinjaman: server.pinjaman, pengingat: server.pengingat ?? data.pengingat });
    } else if (!bawaLokal) {
      aksi.gantiSemua({ ...data, mode: "akun", akun, pinjaman: [], profil: { ...data.profil, penghasilan: null, tanggalGajian: null } });
    } else {
      aksi.setAkun(akun);
    }
    nav(data.profil.penghasilan == null && !bawaLokal ? "/profil-awal" : "/beranda", { replace: true });
  };

  // Tautan dari email: /masuk?tautan=...
  const tautan = cari.get("tautan");
  useEffect(() => {
    if (!tautan) return;
    setSibuk(true);
    verifikasi({ tautan })
      .then((r) => selesaiMasuk(r.token, r.email, null))
      .catch((e: GalatAkun) => setGalat(e.status === 410 ? "Tautan sudah kedaluwarsa (berlaku 15 menit). Kirim tautan baru di bawah." : e.message))
      .finally(() => setSibuk(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tautan]);

  const kirim = async (e?: FormEvent) => {
    e?.preventDefault();
    setGalat(null);
    if (!EMAIL.test(email.trim())) {
      setGalatEmail("Email belum valid. Contoh: nama@email.com");
      return;
    }
    if (!usia) {
      setGalat("Centang pernyataan usia 18 tahun ke atas untuk membuat akun.");
      return;
    }
    setGalatEmail(null);
    setSibuk(true);
    try {
      const r = await kirimTautan(email.trim(), usia);
      setTerkirim(true);
      setKodeDev(r.kode_pengembangan ?? null);
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setSibuk(false);
    }
  };

  const cocokkan = async (e: FormEvent) => {
    e.preventDefault();
    if (kode.length !== 6) {
      setGalat("Masukkan 6 digit kode dari email.");
      return;
    }
    setSibuk(true);
    setGalat(null);
    try {
      const r = await verifikasi({ email: email.trim(), kode });
      await selesaiMasuk(r.token, r.email, null);
    } catch (err) {
      const g = err as GalatAkun;
      setGalat(g.status === 410 ? "Kode sudah kedaluwarsa (berlaku 15 menit). Kirim tautan baru." : g.message);
    } finally {
      setSibuk(false);
    }
  };

  if (tawarBawa) {
    return (
      <Halaman judul="Masuk" lebar="sempit">
        <h2 className="t-h1">Bawa data dari perangkat ini?</h2>
        <p className="mt-2 text-text2">
          Ada {data.pinjaman.length} pinjaman dan profil yang tersimpan di perangkat ini sebagai tamu. Kalau kamu bawa, datanya dicadangkan ke akun <strong className="text-ink">{tawarBawa.email}</strong>.
        </p>
        <div className="mt-8 space-y-3">
          <Tombol blok varian="kedua" onClick={() => selesaiMasuk(tawarBawa.token, tawarBawa.email, true)}>
            Bawa ke akun
          </Tombol>
          <Tombol blok varian="kedua" onClick={() => selesaiMasuk(tawarBawa.token, tawarBawa.email, false)}>
            Jangan bawa, pakai data akun
          </Tombol>
        </div>
        <p className="mt-4 text-sm text-muted">Kalau kamu memilih jangan bawa, data tamu disimpan terpisah di perangkat ini dan kembali saat kamu keluar dari akun. Data tamu tidak dikirim ke server.</p>
      </Halaman>
    );
  }

  return (
    <Halaman judul="Masuk" kembali={true} lebar="sempit">
      <h2 className="t-h1">Masuk tanpa kata sandi</h2>
      <p className="mt-1.5 text-text2">Kami kirim tautan sekali pakai ke emailmu. Tidak ada kata sandi untuk diingat.</p>

      <form onSubmit={kirim} noValidate className="mt-6 space-y-4">
        <IsianTeks
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          nilai={email}
          onNilai={(v) => {
            setEmail(v);
            if (galatEmail) setGalatEmail(null);
          }}
          placeholder="nama@email.com"
          galat={galatEmail}
        />
        <KotakCentang checked={usia} onChange={setUsia} name="usia">
          Aku berusia 18 tahun ke atas.
        </KotakCentang>
        <Tombol type="submit" blok disabled={sibuk}>
          {sibuk && !terkirim ? "Mengirim…" : terkirim ? "Kirim ulang tautan" : "Kirim tautan masuk"}
        </Tombol>
      </form>

      {galat && (
        <div className="mt-4">
          <Pemberitahuan nada="red">{galat}</Pemberitahuan>
        </div>
      )}

      {terkirim && (
        <div className="mt-4">
          <Pemberitahuan ikon={MailCheck}>
            Tautan terkirim ke <strong>{email}</strong>. Buka dari perangkat ini, atau masukkan kodenya di bawah.
          </Pemberitahuan>
        </div>
      )}

      <Kartu varian="catatan" className="mt-6">
        <h3 className="t-h2">Tautan tidak sampai?</h3>
        <p className="mt-1 text-text2">Cek folder spam, atau masukkan kode 6 digit yang ada di email.</p>
        {kodeDev && (
          <p className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-sm font-semibold text-amber">
            Mode pengembangan (tanpa layanan email): kode <span className="angka tracking-widest">{kodeDev}</span>
          </p>
        )}
        <form onSubmit={cocokkan} className="mt-4 space-y-3">
          <KotakKode nilai={kode} onNilai={setKode} />
          <Tombol type="submit" varian="kedua" blok disabled={sibuk || !terkirim}>
            Masuk dengan kode
          </Tombol>
        </form>
      </Kartu>

      <p className="mt-6 text-center text-sm text-muted">Tautan berlaku 15 menit. Kami hanya memakai emailmu untuk masuk dan mengirim pengingat yang kamu aktifkan.</p>
    </Halaman>
  );
}
