"""Uji lapisan AI tahap 2 dengan model tiruan (PRD: logika diuji dengan model tiruan).

Kutipan karangan, angka yang tidak ada di kutipan, angka di luar kisaran alat,
singkatan "juta", dan kalimat anjuran harus ditolak seluruhnya.
"""

from datetime import date
from types import SimpleNamespace

import pytest

from app import uji_paham
from app.dokumen import kutipan_ada, verifikasi
from app.engine import Masukan, hitung, uji_tekanan
from app.explain import angka_resmi, periksa
from app.formatting import angka_dalam_teks
from app.klausul import DAFTAR, KATEGORI, MAKS_KLAUSUL
from app.regulasi import versi_aktif
from app.wawancara import Kewajiban, giliran

REG = versi_aktif(date(2026, 10, 4))

DOKUMEN = """PERJANJIAN PINJAMAN
Jumlah pinjaman: Rp3.000.000 dengan tenor 3 bulan.
Bunga sebesar 9% per bulan dihitung dari pokok.
Biaya layanan  Rp150.000 dipotong saat pencairan.
Denda keterlambatan 0,5% per hari dari total tagihan.
Penyelenggara berhak mengubah syarat dan ketentuan sewaktu-waktu tanpa pemberitahuan.
Peminjam memberikan izin akses kontak untuk keperluan penagihan."""


def _b(nilai, satuan, kutipan):
    return {"nilai": nilai, "satuan": satuan, "kutipan": kutipan}


# --- Angka dan kutipan --------------------------------------------------------------


def test_angka_dalam_teks_dengan_pengali():
    assert 1_900_000 in angka_dalam_teks("sekitar 1,9 juta")
    assert 850_000 in angka_dalam_teks("850 ribu sebulan")
    assert 3_000_000 in angka_dalam_teks("Rp3.000.000")
    assert 0.3 in angka_dalam_teks("0,3% per hari")


def test_kutipan_dinormalkan_spasi_dan_huruf():
    assert kutipan_ada("biaya layanan rp150.000 dipotong", DOKUMEN)
    assert not kutipan_ada("biaya layanan Rp250.000 dipotong", DOKUMEN)
    assert not kutipan_ada("", DOKUMEN)


def test_verifikasi_dokumen_konversi_dan_klausul():
    raw = {
        "angka": {
            "pokok": _b(3000000, "rupiah", "Jumlah pinjaman: Rp3.000.000"),
            "tenor": _b(3, "bulan", "tenor 3 bulan"),
            "bunga": _b(9, "persen_per_bulan", "Bunga sebesar 9% per bulan"),
            "admin": _b(150000, "rupiah", "Biaya layanan Rp150.000 dipotong"),
        },
        "klausul": [
            {"kategori": "denda", "kutipan": "Denda keterlambatan 0,5% per hari dari total tagihan."},
            {"kategori": "perubahan_sepihak", "kutipan": "Penyelenggara berhak mengubah syarat dan ketentuan sewaktu-waktu"},
            {"kategori": "akses_data", "kutipan": "Peminjam memberikan izin akses kontak untuk keperluan penagihan."},
            # kutipan karangan: harus dibuang
            {"kategori": "pelunasan_awal", "kutipan": "Pelunasan lebih awal dikenakan penalti 10%."},
            # kategori di luar daftar: harus dibuang
            {"kategori": "lainnya", "kutipan": "Jumlah pinjaman: Rp3.000.000"},
        ],
    }
    h = verifikasi(raw, DOKUMEN)
    assert h.angka["pokok"].nilai == 3_000_000
    assert h.angka["tenor"].nilai == 90 and h.angka["tenor"].catatan
    assert h.angka["bunga"].nilai == 0.3
    assert h.angka["admin"].nilai == 5
    assert [k.kategori for k in h.klausul] == ["denda", "perubahan_sepihak", "akses_data"]
    assert h.klausul_dibuang == 2
    assert all(k.penjelasan == KATEGORI[k.kategori]["penjelasan"] for k in h.klausul)


def test_verifikasi_menolak_kutipan_palsu_dan_angka_tidak_di_kutipan():
    raw = {
        "angka": {
            "pokok": _b(5000000, "rupiah", "Jumlah pinjaman: Rp3.000.000"),  # angka tidak ada di kutipan
            "tenor": _b(90, "hari", "tenor 90 hari"),  # kutipan karangan
            "bunga": _b(None, "persen_per_hari", None),
            "admin": _b(150000, "rupiah", "Biaya layanan Rp150.000 dipotong"),  # pokok gagal -> tidak bisa dikonversi
        },
        "klausul": [],
    }
    h = verifikasi(raw, DOKUMEN)
    assert h.angka == {"pokok": None, "tenor": None, "bunga": None, "admin": None}
    alasan = {d["bidang"]: d["alasan"] for d in h.angka_ditolak}
    assert alasan["Jumlah pinjaman"] == "angkanya tidak ada di kutipan"
    assert alasan["Tenor"] == "kutipannya tidak ditemukan di teks"
    assert "Biaya admin" in alasan


def test_klausul_dibatasi_delapan():
    raw = {"angka": {}, "klausul": [{"kategori": DAFTAR[0], "kutipan": f"baris {i}"} for i in range(12)]}
    teks = "\n".join(f"baris {i}" for i in range(12))
    h = verifikasi(raw, teks)
    assert len(h.klausul) == MAKS_KLAUSUL
    assert h.klausul_dibuang == 12 - MAKS_KLAUSUL


# --- Pemeriksa --------------------------------------------------------------------


def test_pemeriksa_menolak_singkatan_juta():
    m = Masukan(3_000_000, 90, 0.3, 5, 4_000_000)
    resmi = angka_resmi(m, hitung(m, REG))
    hasil = periksa("Kamu menerima sekitar 2,85 juta.", resmi)
    assert not hasil.lolos
    assert any("juta" in a for a in hasil.alasan)


# --- Uji tekanan --------------------------------------------------------------------


def test_uji_tekanan():
    baris = uji_tekanan(4_000_000, 1_270_000 + 300_000, REG)
    assert [b.penurunan_persen for b in baris] == [0, 10, 20, 30, 40]
    assert baris[0].rasio_persen == pytest.approx(39.25)
    assert baris[1].penghasilan == pytest.approx(3_600_000)
    assert baris[4].rasio_persen == pytest.approx(65.4167, abs=1e-3)
    assert all(b.di_atas_patokan for b in baris)
    lega = uji_tekanan(10_000_000, 2_000_000, REG)
    assert [b.di_atas_patokan for b in lega] == [False, False, False, False, True]
    assert uji_tekanan(0, 1_000_000, REG) == []


# --- Pewawancara dengan model tiruan -------------------------------------------------


def _blok_teks(t):
    return SimpleNamespace(type="text", text=t)


def _blok_alat(i, nama, masukan):
    return SimpleNamespace(type="tool_use", id=i, name=nama, input=masukan)


class KlienTiruan:
    """Mengembalikan respons berurutan dan merekam permintaan."""

    def __init__(self, respons):
        self.respons = list(respons)
        self.permintaan = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kw):
        self.permintaan.append(kw)
        return self.respons.pop(0)


def _resp(blok, stop):
    return SimpleNamespace(content=blok, stop_reason=stop)


def test_wawancara_mencatat_lewat_alat_dan_lolos_pemeriksa():
    klien = KlienTiruan(
        [
            _resp([_blok_alat("t1", "catat_kewajiban", {"nama": "Cicilan motor", "cicilan_per_bulan": 850000, "sisa_bulan": 12})], "tool_use"),
            _resp([_blok_alat("t2", "hitung", {"penurunan_penghasilan_persen": 20, "cicilan_tambahan_per_bulan": 0})], "tool_use"),
            _resp([_blok_teks("Cicilan motor Rp850.000 sudah kucatat. Kalau penghasilan turun 20%, rasio cicilanmu 66,3%.")], "end_turn"),
        ]
    )
    g = giliran([{"peran": "pengguna", "teks": "aku nyicil motor 850 ribu, sisa 12 bulan. kalau gaji turun 20%?"}], [], 4_000_000, 1_270_000, klien=klien)
    assert g.sumber == "ai", g.alasan
    assert len(g.kewajiban) == 1 and g.kewajiban[0].sumber == "ai"
    assert g.kewajiban_baru == [g.kewajiban[0].id]
    hitung_hasil = [h for h in g.hasil_alat if h.alat == "hitung"][0].keluaran
    assert hitung_hasil["rasio_cicilan"] == "66,3%"  # (1.270.000 + 850.000) / 3.200.000
    # hasil alat dikirim balik ke model dalam satu pesan
    assert klien.permintaan[1]["messages"][-1]["content"][0]["type"] == "tool_result"


def test_wawancara_alat_menolak_angka_di_luar_kisaran():
    klien = KlienTiruan(
        [
            _resp([_blok_alat("t1", "catat_kewajiban", {"nama": "Paylater", "cicilan_per_bulan": 500, "sisa_bulan": 3})], "tool_use"),
            _resp([_blok_teks("Berapa nominal cicilan paylater-mu per bulan?")], "end_turn"),
        ]
    )
    g = giliran([{"peran": "pengguna", "teks": "paylater 500, sisa 3 bulan"}], [], 4_000_000, 0, klien=klien)
    assert g.kewajiban == []
    assert g.hasil_alat[0].galat is True
    assert klien.permintaan[1]["messages"][-1]["content"][0]["is_error"] is True


def test_wawancara_menolak_angka_karangan_dan_anjuran():
    for teks in [
        "Total cicilanmu Rp2.500.000 per bulan.",  # angka tidak dari mesin / pengguna
        "Sebaiknya kamu tidak meminjam lagi.",
        "Cicilanmu sekitar 1,2 juta.",
    ]:
        klien = KlienTiruan([_resp([_blok_teks(teks)], "end_turn")])
        g = giliran([{"peran": "pengguna", "teks": "halo"}], [Kewajiban("a1", "Motor", 850000, 12)], 4_000_000, 0, klien=klien)
        assert g.sumber == "ditolak", teks
        assert g.alasan


# --- Uji paham ---------------------------------------------------------------------


def test_uji_paham_verifikasi_kutipan_pengguna():
    jawaban = "aku terima sekitar 2,8 juta, total bayar 3.810.000, cicilannya 1,27 juta sebulan"
    raw = {
        "diterima": {"nilai": 2_800_000, "kutipan": "sekitar 2,8 juta"},
        "total": {"nilai": 3_810_000, "kutipan": "total bayar 3.810.000"},
        "cicilan": {"nilai": 1_500_000, "kutipan": "cicilannya 1,27 juta"},  # angka tidak cocok dengan kutipan
    }
    h = uji_paham.verifikasi(raw, jawaban)
    assert h["angka"]["diterima"]["nilai"] == 2_800_000
    assert h["angka"]["total"]["nilai"] == 3_810_000
    assert h["angka"]["cicilan"] is None
    assert h["ditolak"] == ["cicilan"]


def test_wawancara_kalimat_menyakiti_diri_ai_diam():
    """CIC-04, AC-15: AI tidak dipanggil, layar bantuan prioritas, tidak ada yang disimpan."""
    klien = KlienTiruan([])
    g = giliran([{"peran": "pengguna", "teks": "aku capek, rasanya pengen mati aja"}], [], 4_000_000, 0, klien=klien)
    assert g.bantuan_prioritas is True and g.sumber == "bantuan"
    assert klien.permintaan == []


def test_deteksi_keselamatan_gagal_aman():
    from app.keselamatan import menyiratkan_menyakiti_diri

    for t in ["Aku ingin bunuh diri", "nggak mau hidup lagi", "mau mengakhiri hidup", "aku pengin melukai diri"]:
        assert menyiratkan_menyakiti_diri(t), t
    for t in ["cicilan motor 850 ribu", "aku mati-matian nabung", "bunuh waktu sambil nunggu gajian"]:
        assert not menyiratkan_menyakiti_diri(t) or "mati" in t, t


def test_angka_gabungan_juta_ribu():
    from app.formatting import angka_dalam_teks

    assert 3_270_000 in angka_dalam_teks("total bayar 3 juta 270 ribu")
    assert 1_090_000 in angka_dalam_teks("cicilannya 1 jt 90 rb sebulan")
    assert 2_940_000 in angka_dalam_teks("2 juta dan 940 ribu")
