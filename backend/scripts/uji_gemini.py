"""Uji langsung lapisan AI dengan Gemini (bukan bagian pytest; memakai kunci di backend/.env).

Jalankan dari folder backend: .venv/Scripts/python -m scripts.uji_gemini
"""

from __future__ import annotations

import json
import time

from app.config import settings
from app.dokumen import baca_dokumen
from app.engine import Masukan, hitung
from app.explain import penjelasan_ai
from app.uji_paham import baca_jawaban
from app.wawancara import giliran

print("penyedia:", settings.ai_provider, "| model:", settings.gemini_model, "| AI aktif:", settings.ai_enabled)

TEKS = (
    "Penawaran Pinjaman Kilat. Pokok pinjaman Rp3.000.000 dengan jangka waktu 90 hari. "
    "Bunga 0,1% per hari. Biaya administrasi 2% dari pokok pinjaman dipotong saat pencairan. "
    "Keterlambatan dikenakan denda 0,5% per hari dari jumlah tertunggak. "
    "Pemberi pinjaman berhak mengubah syarat sewaktu-waktu tanpa pemberitahuan. "
    "Pengguna memberikan izin akses kontak dan galeri perangkat."
)


def langkah(nama, f):
    t = time.time()
    try:
        hasil = f()
        print(f"\n== {nama} ({time.time() - t:.1f} dtk)")
        print(hasil)
    except Exception as exc:  # tampilkan jenis galat saja
        print(f"\n== {nama} GAGAL: {type(exc).__name__}: {exc}")


m = Masukan(3_000_000, 90, 0.1, 2, 4_000_000, 300_000)
h = hitung(m)


def jelaskan():
    teks, alasan, penolakan = penjelasan_ai(m, h)
    return {"teks": teks, "alasan": alasan, "penolakan": penolakan}


def dokumen():
    d = baca_dokumen(TEKS).as_dict()
    return json.dumps({"angka": {k: (v and {"nilai": v["nilai"], "kutipan": v["kutipan"]}) for k, v in d["angka"].items()}, "angka_ditolak": d["angka_ditolak"], "klausul": [(k["kategori"], k["kutipan"]) for k in d["klausul"]], "klausul_dibuang": d["klausul_dibuang"]}, ensure_ascii=False, indent=1)


def uji():
    return baca_jawaban("Uang diterima: sekitar 2,9 juta\nTotal bayar: 3 juta 270 ribu\nCicilan per bulan: 1 juta 90 ribu")


def obrolan():
    g = giliran([{"peran": "pengguna", "teks": "aku ada paylater 300 ribu sebulan, sisa 5 bulan. kalau gajiku turun 20% gimana?"}], [], 4_000_000, 1_090_000)
    return {"sumber": g.sumber, "balasan": g.balasan, "alasan": g.alasan, "dicatat": [(k.nama, k.cicilan_per_bulan, k.sisa_bulan) for k in g.kewajiban], "alat": [(a.alat, a.galat) for a in g.hasil_alat]}


for nama, f in [("Penjelasan", jelaskan), ("Baca dokumen", dokumen), ("Uji paham", uji), ("Obrolan cicilan", obrolan)]:
    langkah(nama, f)
    time.sleep(4)  # tingkat gratis: batas permintaan per menit
