/**
 * S24 Butuh bantuan (BTN-01 s.d. BTN-05, PRD 7.9). RAMBU tidak mendiagnosis dan tidak menebak
 * kondisi emosional. Mode prioritas (dari obrolan): AI diam, tidak ada yang disimpan.
 * Nomor kontak diverifikasi ulang sebelum rilis.
 */
import { BookOpen, Check, ChevronDown, Copy, Heart, MessageCircle, Phone, Shield } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Halaman } from "@/components/Shell";
import { Kartu, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { kanalPengaduan } from "@/lib/regulasi";

const CONTOH_PESAN =
  "Halo, saya peminjam dengan nomor kontrak [isi nomor]. Bulan ini saya kesulitan membayar cicilan tanggal [isi tanggal] karena [alasan singkat]. Apakah ada pilihan keringanan, seperti jadwal ulang atau perpanjangan tenor? Saya ingin menyelesaikan kewajiban saya. Terima kasih.";

function Tautan({ href, onClick, children }: { href: string; onClick: () => void; children: ReactNode }) {
  return (
    <a href={href} onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-teal px-4 font-semibold text-teal hover:bg-tint">
      {children}
    </a>
  );
}

function KartuBantuan({ ikon: Ikon, nada, judul, ringkas, children, bukaAwal }: { ikon: typeof Phone; nada: "teal" | "amber"; judul: string; ringkas: string; children: ReactNode; bukaAwal?: boolean }) {
  const [buka, setBuka] = useState(!!bukaAwal);
  return (
    <Kartu className="p-0 lg:p-0" as="li">
      <button type="button" aria-expanded={buka} onClick={() => setBuka((b) => !b)} className="flex w-full items-start gap-4 p-5 text-left">
        <span className={cx("grid size-12 shrink-0 place-items-center rounded-xl", nada === "teal" ? "bg-tint text-teal" : "bg-amber-soft text-amber")}>
          <Ikon aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="t-h2 block">{judul}</span>
          <span className="mt-1 block text-text2">{ringkas}</span>
        </span>
        <ChevronDown aria-hidden className={cx("mt-1 size-5 shrink-0 text-text2 transition-transform", buka && "rotate-180")} />
      </button>
      {buka && <div className="px-5 pb-5 sm:pl-[5.25rem]">{children}</div>}
    </Kartu>
  );
}

export default function Bantuan() {
  const [cari] = useSearchParams();
  const prioritas = cari.get("prioritas") === "1";
  const dari = (cari.get("dari") ?? "lain") as "beranda" | "saya" | "notifikasi" | "obrolan" | "lain";
  const [tersalin, setTersalin] = useState(false);
  useEffect(() => {
    catat("help_hub_opened", { sumber: ["beranda", "saya", "notifikasi", "obrolan"].includes(dari) ? dari : "lain" }, true);
  }, [dari]);
  const ketuk = (jenis: "ojk" | "healing119" | "darurat" | "pesan") => () => catat("help_contact_tapped", { jenis });

  const kontakJiwa = (
    <KartuBantuan ikon={Heart} nada="amber" judul="Bicara tentang perasaanmu" ringkas="Healing119 Kemenkes: telepon 119 lalu tekan 8, atau lewat WhatsApp." bukaAwal={prioritas}>
      <p className="text-text2">Layanan kesehatan jiwa dari Kementerian Kesehatan. Kamu bisa bercerita tanpa harus punya diagnosis apa pun.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Tautan href="tel:119" onClick={ketuk("healing119")}>
          <Phone aria-hidden className="size-4" /> Telepon 119 (lalu tekan 8)
        </Tautan>
      </div>
      <p className="mt-2 text-sm text-muted">Nomor WhatsApp Healing119 tercantum di kanal resmi Kemenkes.</p>
    </KartuBantuan>
  );
  const kontakDarurat = (
    <KartuBantuan ikon={Shield} nada="amber" judul="Kalau keadaan darurat" ringkas="Hubungi layanan darurat 112 atau datangi IGD terdekat." bukaAwal={prioritas}>
      <p className="text-text2">Bila kamu atau orang di dekatmu dalam bahaya sekarang, jangan menunggu.</p>
      <div className="mt-3">
        <Tautan href="tel:112" onClick={ketuk("darurat")}>
          <Phone aria-hidden className="size-4" /> Telepon 112
        </Tautan>
      </div>
    </KartuBantuan>
  );

  return (
    <Halaman judul="Butuh bantuan" kembali={true} lebar="sedang">
      {prioritas ? (
        <div className="mb-6">
          <h2 className="t-h1">Kamu tidak sendirian</h2>
          <p className="prosa mt-2 text-[1.0625rem] text-text2">Obrolan tadi sudah dihentikan dan tidak disimpan. Ada orang yang bisa diajak bicara sekarang juga.</p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="t-h1">Kalau bulan ini terasa berat</h2>
          <p className="prosa mt-2 text-[1.0625rem] text-text2">Banyak orang mengalaminya. Kamu tidak sendirian, dan ada jalan yang bisa dicoba.</p>
        </div>
      )}

      <ul className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {prioritas && kontakJiwa}
        {prioritas && kontakDarurat}
        <KartuBantuan ikon={BookOpen} nada="teal" judul="Bicara dengan pemberi pinjaman" ringkas="Cara meminta keringanan atau jadwal ulang, dengan contoh pesan.">
          <ol className="list-decimal space-y-1.5 pl-5 text-text2">
            <li>Hubungi lewat kanal resmi di aplikasi pinjaman, sebelum jatuh tempo bila bisa.</li>
            <li>Jelaskan singkat dan jujur, lalu tanyakan pilihan: jadwal ulang, perpanjangan tenor, atau pengurangan denda.</li>
            <li>Minta jawaban tertulis, dan simpan bukti percakapan.</li>
            <li>Penagihan harus sesuai aturan. Bila ada ancaman atau penyebaran data, laporkan ke Kontak OJK 157.</li>
          </ol>
          <p className="mt-3 font-semibold text-ink">Contoh pesan</p>
          <p className="mt-1 rounded-xl border border-line bg-sunken p-3 text-sm leading-relaxed text-ink">{CONTOH_PESAN}</p>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(CONTOH_PESAN).then(() => setTersalin(true));
              ketuk("pesan")();
            }}
            className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-teal"
          >
            {tersalin ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {tersalin ? "Tersalin" : "Salin contoh pesan"}
          </button>
          <p className="mt-1 text-sm text-muted">RAMBU tidak mengirim pesan atas namamu dan tidak menghubungi siapa pun.</p>
        </KartuBantuan>
        <KartuBantuan ikon={Phone} nada="teal" judul={kanalPengaduan.nama} ringkas={`Telepon ${kanalPengaduan.telepon}, WhatsApp ${kanalPengaduan.whatsapp}, atau ${kanalPengaduan.email} untuk pengaduan.`}>
          <p className="text-text2">Untuk bertanya atau mengadu soal pinjaman daring, termasuk cara penagihan.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tautan href={`tel:${kanalPengaduan.telepon}`} onClick={ketuk("ojk")}>
              <Phone aria-hidden className="size-4" /> Telepon {kanalPengaduan.telepon}
            </Tautan>
            <Tautan href={`https://wa.me/62${kanalPengaduan.whatsapp.replace(/^0/, "")}`} onClick={ketuk("ojk")}>
              <MessageCircle aria-hidden className="size-4" /> WhatsApp
            </Tautan>
            <Tautan href={`mailto:${kanalPengaduan.email}`} onClick={ketuk("ojk")}>
              Email
            </Tautan>
          </div>
        </KartuBantuan>
        {!prioritas && kontakJiwa}
        {!prioritas && kontakDarurat}
      </ul>

      <Kartu varian="catatan" className="mt-5 p-4 lg:p-5">
        <p className="text-sm leading-relaxed text-text2">
          Nomor kontak diverifikasi ulang sebelum rilis. RAMBU bukan layanan darurat, tidak menyimpan percakapan di layar ini, dan tidak menghubungi siapa pun atas namamu.
        </p>
      </Kartu>
    </Halaman>
  );
}
