/** Galeri hidup sistem desain RAMBU v4 (PRD 8.2, 8.3). Untuk tinjauan desain dan QA visual. */
import { Bell, Calculator, CalendarDays, FileText, HeartHandshake, House, Inbox, List, Lock, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { BilahRasio, GrafikBatang, LencanaPatokan, formatPersen1 } from "@/components/Bilah";
import { IsianAngka } from "@/components/Isian";
import { BlokRumus, Lembar } from "@/components/Lembar";
import { Halaman, PilihTema } from "@/components/Shell";
import {
  Chip,
  DataContoh,
  Kartu,
  Kosong,
  KotakCentang,
  LabelPerkiraan,
  LencanaStatus,
  Pemberitahuan,
  Sakelar,
  Segmented,
  TagAI,
  Tombol,
} from "@/components/ui";
import type { StatusCicilan } from "@/lib/jadwal";

const WARNA = [
  ["ink", "teks utama", "17,06:1"],
  ["text2", "teks kedua", "7,58:1"],
  ["muted", "keterangan", "5,43:1"],
  ["teal", "aksi utama", "5,47:1"],
  ["teal-d", "teks pada tint", "6,71:1"],
  ["amber", "peringatan (teks)", "6,37:1"],
  ["red", "galat (teks)", "5,30:1"],
  ["tint", "latar penjelasan", "6,71:1"],
] as const;

const STATUS: StatusCicilan[] = ["terjadwal", "mendekati", "jatuh_tempo", "terlambat", "dinegosiasikan", "dibayar", "dibayar_terlambat"];

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="t-h2 mb-4">{judul}</h2>
      {children}
    </section>
  );
}

export default function Desain() {
  const [seg, setSeg] = useState<"isi" | "tempel">("isi");
  const [on, setOn] = useState(true);
  const [cek, setCek] = useState(true);
  const [chip, setChip] = useState<Record<string, boolean>>({ "H-3": true, "H-1": false });
  const [nilai, setNilai] = useState<number | null>(3_000_000);
  const [lembar, setLembar] = useState(false);
  return (
    <Halaman judul="Sistem desain" kembali="/saya" lebar="lebar" kanan={<DataContoh />}>
      <p className="prosa mb-8 text-text2">Token dan komponen RAMBU v4. Rasio kontras dihitung dengan rumus WCAG; ambang 4,5:1 untuk teks biasa.</p>

      <Bagian judul="Warna">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WARNA.map(([nama, guna, rasio]) => (
            <div key={nama} className="kartu overflow-hidden">
              <div className="h-16" style={{ background: `var(--${nama})` }} />
              <div className="p-3">
                <p className="font-bold text-ink">{nama}</p>
                <p className="text-sm text-text2">{guna}</p>
                <p className="angka text-sm font-semibold text-ink">{rasio} · AA</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-text2">Coba mode:</span>
          <div className="w-40">
            <PilihTema />
          </div>
        </div>
      </Bagian>

      <Bagian judul="Tipografi · Inter, angka tabular">
        <Kartu className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">Display 38/42</span>
            <span className="t-display">Rp1.390.000</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">H1 26/34</span>
            <span className="t-h1">Judul layar</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">H2 18/24</span>
            <span className="t-h2">Judul kartu</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">Body 16/24</span>
            <span className="text-ink">Teks isi dan kolom input</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">Small 14/20</span>
            <span className="text-sm text-text2">Keterangan dan label</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="w-28 text-sm text-muted">Caption 12/16</span>
            <span className="text-caption font-medium text-text2">Catatan kecil, sumber</span>
          </div>
        </Kartu>
      </Bagian>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Bagian judul="Tombol">
          <Kartu className="flex flex-wrap gap-3">
            <Tombol>Utama</Tombol>
            <Tombol varian="kedua">Sekunder</Tombol>
            <Tombol varian="teks">Teks</Tombol>
            <Tombol varian="hapus">Hapus</Tombol>
            <Tombol disabled>Nonaktif</Tombol>
            <Tombol kecil varian="kedua">
              Tandai sudah bayar
            </Tombol>
          </Kartu>
        </Bagian>
        <Bagian judul="Lencana status cicilan (ikon + teks)">
          <Kartu className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <LencanaStatus key={s} status={s} />
            ))}
            <LabelPerkiraan />
            <TagAI />
          </Kartu>
        </Bagian>
        <Bagian judul="Isian">
          <Kartu className="grid gap-4 sm:grid-cols-2">
            <IsianAngka label="Nilai pinjaman" name="d1" jenis="rupiah" nilai={nilai} onNilai={setNilai} petunjuk="Angka yang tertulis di penawaran" />
            <IsianAngka label="Tenor" name="d2" jenis="bulat" nilai={null} onNilai={() => {}} satuan="hari" galat="Isi angka tanpa huruf." />
          </Kartu>
        </Bagian>
        <Bagian judul="Kontrol">
          <Kartu className="space-y-3">
            <Segmented
              label="Cara mengisi"
              nilai={seg}
              onNilai={setSeg}
              pilihan={[
                { nilai: "isi", label: "Isi" },
                { nilai: "tempel", label: "Tempel" },
              ]}
            />
            <Sakelar label="Notifikasi" keterangan="Dikirim walau aplikasi tertutup" nilai={on} onNilai={setOn} />
            <KotakCentang checked={cek} onChange={setCek}>
              Aku sudah membaca total yang harus kubayar.
            </KotakCentang>
            <div className="flex flex-wrap gap-2">
              {Object.keys(chip).map((k) => (
                <Chip key={k} terpilih={chip[k]} onClick={() => setChip((c) => ({ ...c, [k]: !c[k] }))}>
                  {k}
                </Chip>
              ))}
            </div>
          </Kartu>
        </Bagian>
      </div>

      <Bagian judul="Bilah rasio (garis hitam = patokan)">
        <Kartu className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Dalam patokan</span>
              <span className="angka font-bold text-ink">27,3%</span>
            </div>
            <BilahRasio nilai={27.25} label="Cicilan ini saja" />
            <LencanaPatokan diAtas={false} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Di atas patokan</span>
              <span className="angka font-bold text-ink">34,8%</span>
            </div>
            <BilahRasio nilai={34.75} label="Bersama cicilan lain" tampilSkala />
            <LencanaPatokan diAtas />
          </div>
        </Kartu>
      </Bagian>

      <Bagian judul="Kartu">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kartu>
            <p className="t-h2">Kartu</p>
            <p className="mt-1">Dasar</p>
          </Kartu>
          <Kartu varian="tint">
            <p className="t-h2 text-teal-d">Penjelasan</p>
            <p className="mt-1 text-teal-d">Kontrastif atau kontrafaktual</p>
          </Kartu>
          <Kartu varian="perhatian">
            <p className="t-h2 text-amber">Perhatian</p>
            <p className="mt-1 text-amber">Di atas patokan</p>
          </Kartu>
          <Kartu varian="catatan">
            <p className="t-h2">Catatan</p>
            <p className="mt-1">Informasi tambahan</p>
          </Kartu>
        </div>
      </Bagian>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Bagian judul="Rumus dan lembar bawah">
          <Kartu className="space-y-4">
            <BlokRumus rumus="total = P + P × r × T" langkah={["= 3.000.000 + 3.000.000 × 0,001 × 90", "= 3.000.000 + 270.000", "= Rp3.270.000"]} />
            <Tombol varian="kedua" onClick={() => setLembar(true)}>
              Buka lembar bawah
            </Tombol>
            <Lembar buka={lembar} onTutup={() => setLembar(false)} judul="Total yang dibayar">
              <BlokRumus rumus="total = P + P × r × T" langkah={["= 3.000.000 + 270.000", "= Rp3.270.000"]} />
            </Lembar>
          </Kartu>
        </Bagian>
        <Bagian judul="Grafik batang">
          <Kartu>
            <GrafikBatang
              label="Rasio cicilan per bulan"
              format={formatPersen1}
              garis={{ nilai: 30, label: "patokan 30%" }}
              data={[
                { label: "Okt", nilai: 34.75, nada: "amber" },
                { label: "Nov", nilai: 34.75, nada: "amber" },
                { label: "Des", nilai: 34.75, nada: "amber" },
                { label: "Jan", nilai: 7.5 },
                { label: "Feb", nilai: 7.5 },
                { label: "Mar", nilai: 0 },
              ]}
            />
          </Kartu>
        </Bagian>
      </div>

      <Bagian judul="Pemberitahuan dan keadaan kosong">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <Pemberitahuan>Pinjaman disimpan di perangkatmu.</Pemberitahuan>
            <Pemberitahuan nada="amber">Data mode tamu hilang bila data peramban dihapus.</Pemberitahuan>
            <Pemberitahuan nada="red">Email belum valid. Contoh: nama@email.com</Pemberitahuan>
          </div>
          <Kartu>
            <Kosong ikon={Inbox} judul="Belum ada pinjaman" aksi={<Tombol>Tambah pinjaman</Tombol>}>
              Catat pinjaman yang sudah kamu ambil agar jadwalnya terlihat di satu tempat.
            </Kosong>
          </Kartu>
        </div>
      </Bagian>

      <Bagian judul="Ikon (Lucide, garis)">
        <Kartu className="flex flex-wrap gap-6 text-text2">
          {[House, Calculator, List, CalendarDays, User, Bell, HeartHandshake, FileText, Sparkles, Lock].map((I, i) => (
            <I key={i} aria-hidden className="size-7" />
          ))}
        </Kartu>
      </Bagian>
    </Halaman>
  );
}
