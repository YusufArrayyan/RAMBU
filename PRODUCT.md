# Product

Diturunkan dari `PRD RAMBU v4.0` (5 Okt 2026, `C:\RAFATECH ESSAY\PRD_RAMBU_v4_G1A024009.docx`), yang menggantikan PRD v3.

## Register

product

## Platform

web (PWA). Seluler lebih dulu untuk Peminjam; tata letak yang sama melebar ke desktop Windows. Admin dan Mitra memakai desktop.

## Users

**Peminjam (aktor utama).** Calon atau pemegang pinjaman daring berusia 18 tahun ke atas, terutama pekerja awal dan mahasiswa yang bekerja (usia 19–34 tahun menyumbang 48,22% pinjaman bermasalah). Mereka membuka RAMBU di ponsel, sering saat aplikasi pinjaman masih terbuka di tab lain, dengan uang yang mendesak. RAMBU menemani tiga momen: sebelum setuju (Cek), setelah setuju (Pinjamanku, Jadwal, pengingat), dan saat terasa berat (Bantuan). Mode tamu adalah bawaan (data hanya di perangkat); akun opsional lewat tautan masuk untuk pengingat yang andal dan cadangan.

**Admin RAMBU (internal, desktop).** Tim kecil dengan sub-peran Penyunting, Peninjau, Analis, Superadmin. Menjaga parameter regulasi berversi (aturan dua orang), konten klausul, dan log pemeriksa AI. Tidak ada peran yang bisa membaca data personal pengguna.

**Mitra (F5, desktop).** OJK, peneliti, kampus. Hanya laporan agregat anonim dengan k ≥ 20.

Penyelenggara pinjaman **bukan aktor**: tidak menerima data, tidak membayar, tidak punya antarmuka.

Persona rekaan: Dina, 23, pegawai kontrak Rp4.000.000/bulan dengan paylater Rp300.000/bulan, ditawari Rp3.000.000 selama 90 hari. Raka, 22, pekerja lepas berpenghasilan tidak tetap yang membandingkan dua penawaran.

## Product Purpose

RAMBU adalah pendamping peminjam pinjaman daring. Ia menampilkan dana yang benar-benar diterima, total yang dibayar, rasio seluruh cicilan terhadap penghasilan (juga bila penghasilan turun), biaya efektif per hari dibandingkan batas OJK per segmen, dan kutipan klausul yang perlu dibaca; lalu meminta pengguna menyebut sendiri angka pentingnya. Setelah meminjam, RAMBU mencatat jadwal cicilan dan mengingatkan tanpa menekan. Saat terasa berat, ia menunjukkan jalan bantuan yang nyata.

Kerangkanya Explainable Human-Centered AI: setiap angka bisa ditelusuri ke rumus atau kutipan, dijelaskan secara kontrastif ("kenapa ini, bukan itu") dan kontrafaktual ("apa yang harus berubah"), dan pemahaman pengguna diuji. Prinsip AI: AI mengusulkan, kode memverifikasi, pengguna mengonfirmasi.

Keberhasilan diukur dari apakah pengguna bisa menyebut total yang harus dibayar sebelum setuju, termasuk ketika keputusannya adalah tidak meminjam. Dampak pada gagal bayar atau keselamatan jiwa adalah hipotesis yang diuji, tidak pernah diklaim.

## Positioning

Satu-satunya alat di sisi peminjam yang memeriksa sebuah penawaran terhadap aturan OJK tepat saat keputusan diambil, lalu menemani sampai lunas, dengan angka dari rumus yang bisa diperiksa, bukan dari tebakan model.

## Brand Personality

Tenang, jujur, setara. Seperti teman yang paham hitungan dan duduk di sebelahmu: menyapa dengan "kamu", kalimat pendek, tidak menakut-nakuti, tidak menghakimi penyelenggara maupun pengguna. Setiap angka diberi label "Perkiraan" dan bisa ditelusuri ke rumusnya. Pengingat terdengar seperti catatan pribadi, bukan penagih.

## Anti-references

- Aplikasi pinjol dengan tombol hijau besar "Cairkan sekarang", hitung mundur, dan angka limit raksasa. RAMBU tidak boleh terasa seperti corong penjualan.
- Situs perbandingan berbayar dengan peringkat bintang, lencana "Rekomendasi", dan tautan afiliasi.
- Aplikasi penagihan: merah berkedip, "Anda menunggak!", ancaman, hitung mundur denda.
- Peringatan ala anti-virus yang menakut-nakuti; dasbor bank yang dingin dan penuh istilah.

## Design Principles

1. **Kendali tetap pada manusia.** Tidak ada tombol pengajuan. Layar Putuskan memiliki dua tombol setara dan tiga pernyataan yang dijawab pengguna sendiri.
2. **Angka dahulu, dan selalu bisa ditelusuri.** Satu angka utama per kartu, besar dan tabular. Ikon info pada setiap angka penting membuka rumus yang dihasilkan fungsi yang sama dengan angkanya.
3. **Jujur soal perkiraan.** Label "Perkiraan", asumsi, versi parameter, sumber, dan status verifikasi tampil. Parameter tanpa sumber tidak pernah tampil sebagai batas.
4. **Tenang, bukan menakut-nakuti.** Amber untuk perhatian; merah hanya untuk galat dan hapus. Tanpa kata "macet", "galbay", "menunggak".
5. **Tidak menekan.** Pengingat berhenti setelah ditandai, jam tenang, maksimal 5 per hari, jumlah tidak tampil di layar kunci.
6. **Data seminimal mungkin.** Mode tamu tidak mengirim data keuangan ke server mana pun. AI hanya dipanggil atas klik.
7. **Keselamatan sebelum produk.** Hub Butuh bantuan selalu satu ketukan dari Beranda dan Saya; RAMBU tidak menebak kondisi emosional.

## Accessibility & Inclusion

WCAG 2.2 AA: kontras teks ≥ 4,5:1 (rasio dihitung pada token), teks dasar 16 px, target sentuh ≥ 44 × 44 px, status selalu ikon + teks, fokus selalu terlihat, galat dekat kolom. Rupiah dibaca penuh oleh pembaca layar; bilah rasio punya teks pengganti. `prefers-reduced-motion` dihormati. Lebar minimal 360 px tanpa gulir horizontal. Mode terang bawaan yang tenang, mode gelap mengikuti sistem atau dipaksa di Saya. Bahasa Indonesia baku yang ramah, sapaan "kamu".
