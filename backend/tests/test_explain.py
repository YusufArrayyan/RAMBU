from datetime import date

from app.engine import Masukan, hitung
from app.explain import angka_resmi, penjelasan_templat, periksa
from app.regulasi import versi_aktif

REG = versi_aktif(date(2026, 10, 5))
M = Masukan(3_000_000, 90, 0.3, 5, 4_000_000, 300_000)
H = hitung(M, REG)
RESMI = angka_resmi(M, H)


def test_templat_lolos_pemeriksa_sendiri():
    teks = penjelasan_templat(M, H)
    assert "Rp2.850.000" in teks and "Rp3.810.000" in teks and "39,3%" in teks
    assert "patokan 30%" in teks and "termasuk admin, di atas batas 0,3%" in teks
    assert "melanggar" not in teks
    hasil = periksa(teks, RESMI)
    assert hasil.lolos, hasil.alasan


def test_templat_semua_kasus_tepi_lolos():
    for m in [
        Masukan(1_000_000, 15, 0.3, 0, None, 0),
        Masukan(5_000_000, 200, 0.25, 2, 8_000_000, 500_000),
        Masukan(5_000_000, 200, 0.15, 0, 8_000_000, 0),
        Masukan(3_000_000, 90, 0.1, 2, 4_000_000, 0, "produktif"),
        Masukan(2_750_000, 61, 0.125, 3.5, 6_100_000, 250_000, "konsumtif_kecil"),
    ]:
        h = hitung(m, REG)
        hasil = periksa(penjelasan_templat(m, h), angka_resmi(m, h))
        assert hasil.lolos, (m, hasil.alasan)


def test_tolak_angka_karangan():
    hasil = periksa("Total yang kamu bayar sekitar Rp3.800.000.", RESMI)
    assert not hasil.lolos
    assert any("3.800.000" in a for a in hasil.alasan)


def test_tolak_angka_turunan_yang_tidak_ada_di_mesin():
    assert not periksa("Kalau dua kali, biayanya Rp1.920.000.", RESMI).lolos


def test_tolak_saran_meminjam():
    for kalimat in [
        "Sebaiknya kamu tidak mengambil pinjaman ini.",
        "Jangan meminjam dari penyedia ini.",
        "Ambil saja, cicilannya ringan.",
        "Penawaran ini dijamin aman.",
        "Penyelenggara ini melanggar aturan.",
        "Total bayarmu sekitar 3,8 juta.",
    ]:
        assert not periksa(kalimat, RESMI).lolos, kalimat


def test_terima_penjelasan_yang_patuh():
    teks = (
        "Kamu menerima Rp2.850.000, tetapi perlu mengembalikan Rp3.810.000. "
        "Selisih Rp960.000 adalah biaya pinjamanmu. Cicilannya Rp1.270.000 per bulan; "
        "bersama cicilan lain menjadi 39,3% dari penghasilanmu, di atas patokan 30%."
    )
    hasil = periksa(teks, RESMI)
    assert hasil.lolos, hasil.alasan
