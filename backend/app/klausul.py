"""Tujuh kategori klausul tetap dan penjelasannya (FR-17, FR-19).

Penjelasan ditulis tetap oleh RAMBU, bukan oleh model, dan selalu berlabel
"temuan teks, bukan penilaian hukum". Rujukan bersumber sekunder dan harus
dicocokkan ke teks resmi serta ditinjau penasihat hukum sebelum rilis publik.
"""

from __future__ import annotations

LABEL = "Temuan teks, bukan penilaian hukum"

KATEGORI: dict[str, dict[str, str]] = {
    "biaya_lain": {
        "judul": "Biaya di luar bunga dan admin",
        "penjelasan": (
            "Biaya seperti asuransi, layanan, atau materai menambah uang yang kamu bayar. "
            "Batas manfaat ekonomi harian dari OJK menghitung semua biaya ini, bukan hanya bunga."
        ),
        "rujukan": "SEOJK 19/SEOJK.06/2025, batas manfaat ekonomi",
    },
    "denda": {
        "judul": "Denda keterlambatan",
        "penjelasan": (
            "Denda tidak ikut dihitung di RAMBU, jadi telat bayar membuat biayamu lebih besar dari hasil di layar. "
            "Menurut ketentuan OJK, total manfaat ekonomi termasuk denda paling banyak sebesar nilai pinjaman."
        ),
        "rujukan": "SEOJK 19/SEOJK.06/2025, batas total manfaat ekonomi",
    },
    "perubahan_sepihak": {
        "judul": "Perubahan ketentuan sepihak",
        "penjelasan": (
            "Klausul baku yang membuat konsumen tunduk pada aturan baru yang dibuat sepihak oleh pelaku usaha dilarang, "
            "dan klausul yang melanggarnya batal demi hukum."
        ),
        "rujukan": "UU 8/1999 tentang Perlindungan Konsumen, Pasal 18 ayat (1) huruf g dan ayat (3) (pembahasan Hukumonline, sumber sekunder)",
    },
    "akses_data": {
        "judul": "Akses data di ponselmu",
        "penjelasan": (
            "Pejabat OJK menyatakan aplikasi pinjaman berizin hanya boleh mengakses kamera, mikrofon, dan lokasi. "
            "Permintaan akses kontak dinyatakan ilegal."
        ),
        "rujukan": "Pernyataan pejabat OJK, CNBC Indonesia 21 Agustus 2024 (sumber sekunder, perlu dicocokkan ke POJK terbaru)",
    },
    "penagihan": {
        "judul": "Penagihan dan kontak darurat",
        "penjelasan": (
            "Menurut pernyataan pejabat OJK yang sama, kontak darurat hanya untuk memastikan lokasi peminjam. "
            "Perhatikan siapa saja yang boleh dihubungi saat penagihan."
        ),
        "rujukan": "Pernyataan pejabat OJK, CNBC Indonesia 21 Agustus 2024 (sumber sekunder, perlu dicocokkan ke POJK terbaru)",
    },
    "perpanjangan": {
        "judul": "Perpanjangan atau pinjaman ulang",
        "penjelasan": (
            "Perpanjangan tenor atau pinjaman ulang bisa menambah bunga dan biaya baru. "
            "Hitung ulang total bayarnya di RAMBU sebelum menyetujui perpanjangan."
        ),
        "rujukan": "Catatan RAMBU",
    },
    "pelunasan_awal": {
        "judul": "Pelunasan lebih awal",
        "penjelasan": (
            "Periksa apakah ada biaya bila kamu melunasi lebih cepat, dan apakah bunga untuk sisa tenor tetap ditagih."
        ),
        "rujukan": "Catatan RAMBU",
    },
}

DAFTAR = list(KATEGORI)
MAKS_KLAUSUL = 8
