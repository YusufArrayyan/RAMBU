---
version: 4
name: RAMBU
description: Pendamping peminjam yang tenang dan terang. Kanvas slate sangat muda, kartu putih bersudut 16 px dengan garis tipis, satu tombol teal per layar, angka besar tabular, amber hanya untuk perhatian. Seluler lebih dulu; di desktop navigasi bawah menjadi sidebar dan layar melebar menjadi dua kolom.
source: PRD RAMBU v4.0 Bagian 8 (Gambar 12 token, Gambar 13 komponen, mockup S01–S26, A01–A04, M01)

colors:
  # Mode terang (rasio dihitung terhadap surface #ffffff kecuali disebut lain)
  canvas: "#f8fafc"          # latar halaman, slate-50 netral dingin (bukan krem)
  surface: "#ffffff"         # kartu
  sunken: "#f1f5f9"          # segmented, isian nonaktif, baris ringkasan
  line: "#e2e8f0"            # garis kartu dan pemisah (dekoratif)
  line-strong: "#94a3b8"     # tepi input dan kotak centang (3:1 untuk komponen UI)
  ink: "#0f172a"             # teks utama, angka · 17.06:1
  text2: "#475569"           # teks kedua · 7.58:1
  muted: "#5b6b82"           # keterangan · 5.43:1 (4.9:1 di canvas)
  teal: "#0f766e"            # aksi utama, tautan, tab aktif · 5.47:1
  teal-d: "#115e59"          # teks di atas tint · 6.71:1
  tint: "#e6f4f1"            # kartu Penjelasan, lencana sukses
  tint-line: "#a7d7cd"
  amber: "#92400e"           # teks peringatan · 6.37:1 (di atas amber-soft 5.9:1)
  amber-soft: "#fef3c7"      # latar lencana dan kartu Perhatian
  amber-line: "#f2c46b"
  amber-bar: "#d97706"       # isian bilah di atas patokan (grafis, bukan teks)
  red: "#b91c1c"             # galat dan hapus saja · 5.30:1 (spec Gambar 12: #b91c1c)
  red-soft: "#fee2e2"
  neutral-chip: "#e2e8f0"    # lencana Terjadwal, teks #334155
  # Mode gelap
  dark-canvas: "#0b1220"     # 15.89:1 dengan teks
  dark-surface: "#111a2e"
  dark-sunken: "#0e1626"
  dark-line: "#1e293b"
  dark-ink: "#e6edf7"
  dark-text2: "#b6c2d4"
  dark-muted: "#94a3b8"
  dark-teal: "#2dd4bf"       # 10.06:1; teks di atas tombol #042f2e
  dark-tint: "#0f2e2c"
  dark-amber: "#fde68a"      # 11.08:1
  dark-amber-soft: "#3a2a0c"
  dark-amber-bar: "#f59e0b"
  dark-red: "#f87171"        # 6.77:1

typography:
  family: "Inter Variable, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  numeric: "font-variant-numeric: tabular-nums pada semua rupiah, persen, tanggal"
  mono: "ui-monospace, SFMono-Regular, Consolas, monospace (hanya blok rumus)"
  display: { size: 38px, lineHeight: 42px, weight: 800, letterSpacing: -0.02em }  # angka utama kartu
  h1:      { size: 26px, lineHeight: 34px, weight: 800, letterSpacing: -0.015em } # judul layar / judul hasil
  h2:      { size: 18px, lineHeight: 24px, weight: 700 }                          # judul kartu
  body:    { size: 16px, lineHeight: 24px, weight: 400 }                          # minimum isi
  small:   { size: 14px, lineHeight: 20px, weight: 400 }                          # keterangan dan label
  caption: { size: 12px, lineHeight: 16px, weight: 500 }                          # sumber, catatan kecil
  desktop: "h1 naik ke 30/38 dan display ke 44/48 di ≥1024 px; skala tetap (rem), bukan clamp"

rounded:
  card: 16px
  button: 14px
  input: 14px
  chip: 9999px
  sheet: 24px   # bottom sheet bagian atas
  dialog: 20px  # lembar bawah tampil sebagai dialog tengah di desktop
  inner: 12px   # blok rumus dan kutipan di dalam kartu
  focus: 10px   # cincin fokus

spacing: { base: 4px, scale: [4, 8, 12, 16, 24, 32, 48] }

layout:
  mobile: "< 640 px: satu kolom, gutter 16 px (20 px ≥ 400), tab bar bawah 5 item, tombol utama menempel di bawah layar alur Cek"
  tablet: "640–1023 px: tab bar bawah tetap, isi selebar 720 px di tengah, grid 2 kolom bila berguna"
  desktop: "≥ 1024 px: sidebar 248 px (logo, 5 tujuan, Butuh bantuan, tema), isi maksimum 1120 px, layar hasil dua kolom (isi 1.4fr + panel penjelasan 1fr menempel)"
  admin: "Sidebar 280 px; tata letak penuh ≥ 1280 px, di bawahnya kolom menumpuk"
  touch-min: 44px

components:
  button-primary:   { bg: teal, fg: "#fff", radius: button, height: 52px, weight: 700 }
  button-secondary: { bg: surface, fg: teal, border: "1.5px teal", radius: button, height: 52px }
  button-text:      { fg: teal, height: 44px }
  button-danger:    { fg: red, bg: transparent, height: 44px }
  button-small:     { height: 40px, hitArea: 44px }
  input:            { height: 56px, radius: input, border: line-strong, focus: "2px teal + cincin tint", error: "border red + pesan di bawah kolom", affix: "Rp di kanan, hari/% di kanan" }
  badge-status:     "ikon + teks, pil; 7 status cicilan: Terjadwal (netral), Mendekati (amber, jam), Jatuh tempo (amber, segitiga), Terlambat (red-soft, segitiga), Dinegosiasikan (netral, gelembung), Dibayar (tint, centang), Dibayar terlambat (tint, centang)"
  segmented:        { bg: sunken, active: surface, radius: button }
  toggle:           { on: teal, off: line-strong, size: "52×32", role: switch }
  chip-filter:      "pil berbingkai; terpilih = tint + centang + tepi teal (H-3, H-1, ...)"
  card:             { base: "surface + 1px line, radius 16, padding 20 (24 desktop)", tint: "Penjelasan: tint + tepi teal", attention: "Perhatian: amber-soft + tepi amber-line", note: "Catatan: transparan + tepi putus-putus line-strong" }
  ratio-bar:        "rel 0–50%, penanda tegak hitam 3 px di patokan 30%; isian teal bila ≤ patokan, amber-bar bila di atas; selalu dengan teks persen dan lencana"
  formula-block:    "latar sunken, mono 14 px, baris per langkah, angka pengguna disisipkan; dihasilkan fungsi engine yang sama"
  quote:            "kutipan dokumen: latar sunken, tanda kutip, tepi penuh 1 px; label sumber di bawah"
  ai-tag:           "lencana kecil 'AI' berikon kilau pada setiap keluaran AI"
  bottom-sheet:     "dialog native, radius atas 24 px; di desktop menjadi dialog tengah 480 px"
  tab-bar:          "5 item ikon + label: Beranda, Cek, Pinjamanku, Jadwal, Saya; aktif = teal"
  calendar:         "grid 7 kolom, Senin pertama; titik status di bawah tanggal + label teks untuk pembaca layar"
---

## Overview

RAMBU diambil dari rambu jalan: penanda yang memberi tahu kondisi di depan sebelum seseorang melangkah. Bahasa visualnya tenang dan terang. Teal adalah jalan, dipakai untuk aksi dan keadaan aman. Amber muncul hanya ketika ada yang perlu diperhatikan. Merah hanya untuk galat isian dan tindakan menghapus, tidak pernah untuk hasil hitungan.

**Adegan pemakaian.** Dina, 23 tahun, duduk di kos setelah kerja, ponsel di tangan, aplikasi pinjaman terbuka di tab lain, cemas soal uang. Ia butuh layar yang tidak berteriak, kontras tinggi, dan angka yang langsung terbaca. Karena itu mode terang yang tenang adalah bawaan (PRD K-11 menolak desain gelap bawaan), dan mode gelap tersedia setara mengikuti sistem. Raka membuka RAMBU di laptop Windows di warnet atau kampus untuk membandingkan dua penawaran; di sana layar melebar menjadi dua kolom agar hasil dan penjelasan terlihat berdampingan.

**Strategi warna: Restrained.** Netral slate dingin + satu aksen teal (≤ 10% permukaan). Amber adalah warna status. Kanvas `#f8fafc` adalah slate netral, bukan krem.

## Colors

Semua pasangan teks dan latar memenuhi WCAG 2.2 AA (≥ 4,5:1); rasio tertulis di token dan dihitung dengan rumus WCAG (PRD Gambar 12).

- **Teal `#0f766e`**: tombol utama (satu per layar), tautan, tab aktif, isian bilah dalam patokan, lencana Dibayar.
- **Tint `#e6f4f1` + teal-d `#115e59`**: kartu Penjelasan (kontrastif, kontrafaktual), lencana sukses.
- **Amber `#92400e` di atas `#fef3c7`**: lencana dan kartu Perhatian ("Di atas patokan 30%"). Isian bilah memakai `#d97706`, yang hanya grafis.
- **Red `#b91c1c`**: pesan galat kolom dan tombol Hapus. Lencana Terlambat memakai red-soft dengan teks red karena itu status, bukan hasil hitungan; tetap dengan ikon dan kata.
- **Ink / text2 / muted**: tiga tingkat teks. Muted `#5b6b82` hanya untuk keterangan, tidak untuk isi utama.
- **Mode gelap**: kanvas `#0b1220`, kartu `#111a2e`, teal naik ke `#2dd4bf` dengan teks gelap `#042f2e` di atas tombol, amber `#fde68a`, red `#f87171`.

## Typography

Satu keluarga, **Inter** (PRD Gambar 12), di-host sendiri lewat `@fontsource-variable/inter` sehingga tidak ada permintaan ke CDN pihak ketiga (NFR-07). Hierarki dari bobot dan ukuran dengan skala tetap. Semua nominal `tabular-nums`. Rumus memakai fon monospasi sistem. Judul memakai `text-wrap: balance`; paragraf panjang `text-wrap: pretty` dan dibatasi 68ch.

Format angka: `Rp3.270.000` (tanpa spasi, titik ribuan), persen `34,8%`, lewat `Intl.NumberFormat('id-ID')`. Pembaca layar mendapat rupiah dalam kata ("tiga juta dua ratus tujuh puluh ribu rupiah").

**Penyesuaian dari mockup.** Mockup PRD memakai label kecil berhuruf kapital berspasi lebar di atas angka utama ("KEWAJIBAN OKTOBER"). Di aplikasi label itu ditulis kapital awal saja, 14 px tebal 600, warna text2. Isinya sama, tetapi tidak menjadi pola eyebrow di setiap kartu.

## Layout

### Peminjam (PWA)

| Lebar | Navigasi | Isi |
|---|---|---|
| < 640 px | Tab bar bawah, 5 item, aman untuk `safe-area-inset-bottom` | Satu kolom, gutter 16–20 px. Tombol utama alur Cek menempel di bawah. |
| 640–1023 px | Tab bar bawah | Kolom 720 px di tengah. Bandingkan dan Ringkasan bulanan dua kolom. |
| ≥ 1024 px | Sidebar 248 px: logo, Beranda, Cek, Pinjamanku, Jadwal, Saya; di dasar tautan "Butuh bantuan" dan pemilih tema | Isi maksimum 1120 px. Beranda: kartu kewajiban (7/12) + Berikutnya (5/12). Biaya sebenarnya dan Penjelasan: isi + panel telusur menempel di kanan. Bandingkan: tiga kolom. Kalender: bulan + rincian hari berdampingan. Tombol utama tidak menempel, diletakkan di akhir isi. |

Alur Cek menampilkan "n dari 4" untuk langkah utama (Isi penawaran, Biaya sebenarnya, Semua cicilan, Putuskan). Tombol kembali selalu ada.

### Admin dan Mitra (desktop)

Sidebar 280 px berisi Dasbor, Parameter, Konten klausul, Log pemeriksa, Pengguna admin, dan di dasar kotak "Masuk sebagai [peran]". Kartu angka di atas, grafik dan aktivitas di bawah. Lencana "DATA CONTOH" amber di kanan atas setiap layar. Di bawah 1280 px kolom menumpuk; di bawah 1024 px sidebar menjadi laci.

### Spasi

Kelipatan 4 px. Padding kartu 20 px (24 di desktop). Ritme bervariasi: 8 px di dalam grup, 12 px antar baris, 16 px antar kartu, 32 px antar bagian.

## Elevation & Depth

Datar. Kartu putih di atas kanvas slate dengan garis 1 px `line`. Bayangan hanya untuk bilah aksi yang menempel di bawah layar ponsel, tab bar, bottom sheet, dan toast, agar jelas mengambang. Skala z-index: `sticky 10 → tabbar 20 → sheet-backdrop 30 → sheet 40 → toast 50`.

## Shapes

Kartu 16 px, tombol dan input 14 px, lencana dan chip pil, bottom sheet 24 px di atas. Belah ketupat rambu hanya ada di logo.

## Components

Komponen yang dapat dipakai ulang (PRD 8.3): Button (utama, sekunder, teks, hapus, nonaktif), Input (default, fokus, galat, dengan satuan), Badge status, Chip, Segmented, Toggle, Checkbox, Card (dasar, tint, perhatian, catatan), RatioBar, Quote, FormulaBlock, BottomSheet, AppBar, TabBar, Calendar, Chart batang, AITag. Galeri hidup di rute `/desain`.

- **Kartu angka utama**: label 14/600 text2, angka display 38/800, lalu lencana dan bilah. Satu angka utama per kartu.
- **Baris rincian dengan telusur**: label kiri, angka kanan tebal, ikon ⓘ teal 44 px yang membuka BottomSheet berisi FormulaBlock.
- **RatioBar**: rel abu, isian teal atau amber, penanda patokan hitam 3 px, teks "0% · patokan 30% · 50%" di bawah pada kartu Beranda. Teks pengganti: "34,8 persen penghasilan, di atas patokan 30 persen".
- **Lencana batas OJK**: "Di bawah batas 0,3% dengan dan tanpa admin" (tint, centang) atau "Di atas batas jika admin dihitung" (amber, segitiga). Tidak pernah "melanggar".
- **Kartu Penjelasan** (tint): kontrastif dan kontrafaktual. Kontrafaktual selalu memuat "syarat lain tetap" dan "Ini informasi, bukan saran." Tidak ada tombol terapkan.
- **Kartu Catatan** (garis putus-putus): asumsi hitung, catatan netralitas di Putuskan, catatan "catatanmu, bukan data penyelenggara" di Pinjamanku.
- **Putuskan**: dua tombol sekunder berbobot setara selebar penuh + tombol teks "Ubah angka". Tidak ada tombol utama.
- **Kartu lembut bantuan**: kartu biasa berikon hati, kalimat "Bulan ini terasa berat? Lihat pilihan bantuan", bisa ditutup.

## Motion

150–250 ms, `cubic-bezier(0.25, 1, 0.5, 1)`. Hanya untuk perubahan status: isian bilah (`scaleX`), segmented, toggle, sheet naik (translate + fade), toast. Tidak ada animasi masuk halaman bertahap. `prefers-reduced-motion: reduce` membuat semuanya instan.

## Voice

| Konteks | Pakai | Hindari |
|---|---|---|
| Telat bayar | "Cicilan 12 Okt belum ditandai. Sudah dibayar?" | "Anda menunggak!", "galbay", "macet" |
| Hasil hitung | "Rasio 34,8%, di atas patokan 30%." | "Pinjamanmu berbahaya." |
| Keputusan | "Keputusan ada padamu." | "Sebaiknya jangan pinjam." / "Ajukan sekarang." |
| Bantuan | "Kalau bulan ini terasa berat, ada pilihan bantuan." | Menebak kondisi emosional |
| AI | "AI mencatat. Angka dihitung mesin." | "AI menyarankan…" |

Kata "macet", "galbay", "menunggak" tidak muncul di antarmuka (uji AC-16).

## Do's and Don'ts

**Lakukan**
- Tampilkan "Kamu menerima X, tapi membayar Y" sebelum rincian.
- Beri label "Perkiraan" pada hasil dan "patokan" (bukan "batas hukum") pada 30%.
- Tampilkan versi parameter, sumber, dan status verifikasi di Cara hitung.
- Selalu pasangkan status dengan ikon dan kata.

**Jangan**
- Jangan menaruh tombol pengajuan atau tombol utama di Putuskan.
- Jangan memakai merah untuk hasil hitungan.
- Jangan membuat peringkat atau rekomendasi penyelenggara.
- Jangan memakai garis aksen tebal di sisi kartu, teks bergradasi, glassmorphism, atau kartu bertumpuk.
- Jangan menampilkan jumlah rupiah di notifikasi saat mode privasi hidup.
