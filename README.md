# RAMBU · Rujukan Analisis Mampu Bayar dan Utang

Pendamping peminjam pinjaman daring (PWA, ponsel dan desktop). RAMBU menemani tiga momen: **sebelum setuju** (Cek: biaya sebenarnya, rasio terhadap penghasilan, biaya efektif dibanding batas OJK per segmen, klausul, uji paham, Putuskan), **setelah setuju** (Pinjamanku, Jadwal, pengingat yang tidak menekan), dan **saat terasa berat** (Butuh bantuan). Hitungan dikerjakan rumus tetap; AI hanya membaca, bertanya, dan mengutip, dan setiap keluarannya diperiksa kode. Tidak ada tombol pengajuan.

- **PRD**: `C:\RAFATECH ESSAY\PRD_RAMBU_v4_G1A024009.docx` (v4.0, 5 Okt 2026, menggantikan v3)
- **Konteks produk**: [PRODUCT.md](PRODUCT.md) · **Sistem desain**: [DESIGN.md](DESIGN.md) · galeri hidup di rute `/desain`

## Menjalankan

Kebutuhan: Node 20+ dan Python 3.11+.

```bash
# Backend (API + analitik + AI tahap 2)
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # macOS/Linux: .venv/bin/python
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# Frontend (terminal lain)
cd frontend
npm install
npm run dev        # http://localhost:5173, /api diproksikan ke :8000
```

Frontend tetap bekerja penuh tanpa backend: semua hitungan berjalan di perangkat. Backend hanya dibutuhkan untuk akun opsional (cadangan dan pengingat email), analitik anonim, panel admin, dan fitur AI.

Produksi dalam satu kontainer (FastAPI menyajikan API dan hasil build frontend):

```bash
docker compose up --build    # http://localhost:8000
```

Konfigurasi ada di `backend/.env` (salin dari [backend/.env.example](backend/.env.example)):

| Variabel | Fungsi |
|---|---|
| `RAMBU_AI_ENABLED` | `true` untuk mengaktifkan lapisan AI. Bawaan `false`; tanpa ini, kartu AI disembunyikan (DOK-06). |
| `RAMBU_AI_PROVIDER` | `anthropic` (bawaan) atau `gemini`. Gemini memakai `GEMINI_API_KEY` (tingkat gratis) dengan model cadangan bila kelebihan beban. Semua keluaran tetap melewati pemeriksa kode. |
| `ANTHROPIC_API_KEY` | Kredensial model. Model hanya dipanggil atas klik atau pesan pengguna, tanpa percobaan ulang otomatis. |
| `RAMBU_MODEL` | Model Claude, bawaan `claude-opus-5-5`. |
| `RAMBU_ADMIN_TOKEN` | Token superadmin darurat (opsional). Admin biasa masuk dengan token pribadi per peran. |
| `RAMBU_ENV` / `RAMBU_SECRET_KEY` | `production` mewajibkan kunci induk untuk enkripsi data akun. |
| `RAMBU_SMTP_*` | Email tautan masuk dan pengingat. Kosong di pengembangan: kode masuk tampil di layar. |
| `RAMBU_VAPID_PRIVATE_KEY` / `RAMBU_VAPID_SUBJECT` | Web Push. Kosong di pengembangan: kunci dibuat di `backend/.keys`. |
| `RAMBU_SEED_CONTOH` | Data contoh panel admin (hanya pengembangan). |
| `RAMBU_DATABASE_URL` | Basis data analitik, bawaan SQLite. |
| `RAMBU_AI_RATE_LIMIT` / `RAMBU_AI_RATE_WINDOW` | Batas pemakaian AI per klien. |

## Pengujian

```bash
cd backend && .venv/Scripts/python -m pytest      # 49 tes: Web Push (enkripsi, langganan, cabut saat keluar), golden v4, uji properti kontrafaktual, pemeriksa, akun, aturan dua orang, k-anonimitas, penjadwal
cd frontend && npm test                            # 49 tes: golden v4, uji properti kontrafaktual (5.000 masukan), jadwal, 7 status, pengingat, .ics, uji paham
cd frontend && npm run build                       # typecheck + build
cd frontend && npm run e2e                         # 15 uji ujung ke ujung (Playwright + Edge): AC-01–AC-04, AC-09–AC-11, AC-13, AC-14, AC-16, AC-17, offline, 360 px
```

Mesin hitung ada dua (TypeScript di perangkat, Python di server). Keduanya diuji dengan berkas yang sama, [shared/golden.json](shared/golden.json), berisi tiga contoh acuan PRD (A, B, C) dan delapan kasus tepi.

## Struktur

```
shared/
  regulasi.json     parameter OJK berversi per segmen, dengan sumber dan status (PRD 12.1)
  golden.json       uji acuan PRD 12.2 (A/B/C, uji tekanan, kontrastif, kontrafaktual, kasus tepi)
frontend/           React 19 + Vite + TypeScript + Tailwind v4, PWA (public/sw.js)
  src/lib/          engine (hitung, kontrastif, kontrafaktual), telusur, jadwal (7 status cicilan),
                    pengingat (H-3..H+3, jam tenang, maks 5/hari, privasi), ics, akun, analitik 16.2
  src/pages/        onboarding (S01–S04), Beranda (S05), cek (S06–S15), pinjaman (S16–S19),
                    jadwal (S20–S21), saya (S22–S26), admin (A01–A04, M01), Desain
backend/            FastAPI + SQLAlchemy
  app/engine.py     mesin hitung kembar
  app/routes/akun.py    tautan masuk 15 menit + kode 6 digit, cadangan terenkripsi, hapus akun
  app/routes/admin.py   dasbor, parameter berversi (aturan dua orang), konten klausul, log pemeriksa, laporan mitra k≥20
  app/pengingat.py      penjadwal pengingat mode akun (email)
  app/pemeriksa.py      pemeriksa keluaran AI
```

## Peta layar (PRD v4)

| Layar | Rute | Layar | Rute |
|---|---|---|---|
| S01 Selamat datang | `/selamat-datang` | S14 Uji paham | `/cek/uji-paham` |
| S02 Cara memakai | `/cara-pakai` | S15 Putuskan | `/cek/putuskan` |
| S03 Masuk | `/masuk` | S16 Pinjamanku | `/pinjamanku` |
| S04 Profil singkat | `/profil-awal` | S17 Tambah pinjaman | `/pinjamanku/tambah` |
| S05 Beranda | `/beranda` | S18–S19 Detail, catat bayar | `/pinjamanku/:id` |
| S06–S07 Isi penawaran, baca dokumen | `/cek` | S20 Kalender | `/jadwal` |
| S08 Biaya sebenarnya | `/cek/hasil` | S21 Ringkasan bulanan | `/jadwal/ringkasan` |
| S09 Penjelasan | `/cek/penjelasan?tab=dari\|kenapa\|ubah` | S22 Atur pengingat | `/saya/pengingat` |
| S10 Klausul | `/cek/klausul` | S23 Notifikasi | `/saya/notifikasi` |
| S11 Bandingkan | `/cek/bandingkan` | S24 Butuh bantuan | `/bantuan` |
| S12 Semua cicilan | `/cek/cicilan` | S25 Saya | `/saya` |
| S13 Obrolan cicilan | `/cek/obrolan` | S26 Cara menghitung | `/cara-hitung` |
| A01–A04, M01 | `/admin`, `/admin/parameter`, `/admin/klausul`, `/admin/log`, `/admin/mitra` | | |

Mode gelap (S05d, S08d) mengikuti sistem atau dipilih di Saya. Di desktop (≥ 1024 px) tab bar bawah menjadi sidebar dan layar hasil melebar menjadi dua kolom.

Panel admin di lingkungan pengembangan memakai data contoh; token masuk contoh tercatat di [backend/.env.example](backend/.env.example).

## Catatan sebelum rilis publik

Hal bertanda PERLU DATA di PRD v4 belum bisa diputuskan kode:

- Batas bunga tenor lebih dari 6 bulan (0,1–0,2%) dan apakah batas harian termasuk admin: layar menampilkan dua angka dan lencana "belum pasti" sampai teks ketentuan jelas.
- Cakupan patokan 30% (seluruh kreditur atau per penyelenggara); label "patokan", bukan "batas hukum".
- Daftar akhir tujuh kategori klausul dan penjelasannya (penasihat hukum).
- Ambang kartu lembut dan daftar kata pemicu bahaya diri (psikolog klinis). Daftar kata sementara di `frontend/src/lib/keselamatan.ts` dan `backend/app/keselamatan.py` sengaja gagal-aman.
- Nomor darurat 112 dan seluruh kontak diverifikasi ulang sebelum rilis.
- Notifikasi push (Web Push, VAPID) sudah berjalan untuk mode akun; produksi wajib menyetel `RAMBU_VAPID_PRIVATE_KEY`. Di iPhone push hanya bekerja bila RAMBU dipasang ke Layar Utama. Mode tamu memakai banner dan berkas .ics.
- Posisi hukum RAMBU, DPIA, tenggat penghapusan, lokasi pemrosesan, dan kebijakan penyedia AI.
- Lapisan AI baru diuji dengan model tiruan; mutu dengan model sungguhan belum dievaluasi.
