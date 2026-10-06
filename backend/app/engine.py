"""Mesin hitung deterministik RAMBU (PRD v4 Bagian 12).

Semua angka yang tampil di RAMBU, termasuk angka di dalam jawaban AI, berasal dari fungsi
di sini. Kembaran TypeScript ada di frontend/src/lib/engine.ts; keduanya diuji dengan
shared/golden.json.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from decimal import Decimal

from .regulasi import Batas, VersiRegulasi, versi_aktif

EPS = Decimal("1e-9")


@dataclass(frozen=True)
class Masukan:
    pokok: float  # P, rupiah
    tenor: int  # T, hari
    bunga_harian_persen: float  # r x 100
    admin_persen: float  # a x 100
    penghasilan: float | None = None  # I, rupiah per bulan
    cicilan_lain: float = 0  # K, rupiah per bulan
    segmen: str = "konsumtif"


@dataclass(frozen=True)
class Hasil:
    bunga: float
    admin: float
    diterima: float
    total: float
    biaya: float
    biaya_persen_pokok: float
    jumlah_cicilan: int
    cicilan: float
    rasio_sendiri_persen: float | None
    rasio_persen: float | None
    patokan_persen: float
    di_atas_patokan: bool | None
    bunga_harian_persen: float
    efektif_harian_persen: float
    batas_tipe: str
    batas_persen: float | None
    batas_min: float | None
    batas_maks: float | None
    status_batas: str
    batas_total_persen: float | None
    di_atas_batas_total: bool | None
    versi_parameter: str

    def as_dict(self) -> dict:
        return asdict(self)


def _d(x: float | int) -> Decimal:
    # Lewat str agar 0.3 tetap 0.3, bukan 0.29999...
    return Decimal(str(x))


def valid(m: Masukan) -> bool:
    return (
        m.pokok > 0
        and m.tenor >= 1
        and m.bunga_harian_persen >= 0
        and 0 <= m.admin_persen < 100
        and (m.cicilan_lain or 0) >= 0
        and (m.penghasilan is None or m.penghasilan >= 0)
    )


def jumlah_cicilan_untuk(tenor: int) -> int:
    return max(1, math.ceil(tenor / 30))


def posisi_batas(bunga_harian: Decimal, efektif: Decimal, b: Batas, dengan_admin: bool = False) -> str:
    """Admin termasuk batas: bandingkan biaya efektif. Belum pasti: dua angka (CEK-07)."""
    if dengan_admin and b.tipe == "tunggal":
        return "atas_batas" if efektif > _d(b.persen) + EPS else "bawah_batas"
    if b.tipe == "tunggal":
        batas = _d(b.persen)
        if bunga_harian > batas + EPS:
            return "atas_bunga"
        if efektif > batas + EPS:
            return "atas_jika_admin"
        return "bawah_keduanya"
    lo, hi = _d(b.min), _d(b.maks)
    if bunga_harian > hi + EPS:
        return "atas_bunga"
    if efektif <= lo + EPS:
        return "bawah_keduanya"
    if bunga_harian <= lo + EPS and efektif > hi + EPS:
        return "atas_jika_admin"
    return "belum_pasti"


def hitung(m: Masukan, regulasi: VersiRegulasi | None = None) -> Hasil | None:
    """Kembalikan None bila pokok atau tenor nol/tidak valid (hasil tidak ditampilkan)."""
    if not valid(m):
        return None
    reg = regulasi or versi_aktif()

    P = _d(m.pokok)
    T = int(m.tenor)
    r = _d(m.bunga_harian_persen) / 100
    a = _d(m.admin_persen) / 100
    K = _d(m.cicilan_lain or 0)

    bunga = P * r * T
    admin = P * a
    diterima = P - admin
    total = P + bunga
    biaya = total - diterima
    n = jumlah_cicilan_untuk(T)
    cicilan = total / n
    I = _d(m.penghasilan) if m.penghasilan else None
    rasio_sendiri = cicilan / I * 100 if I else None
    rasio = (cicilan + K) / I * 100 if I else None
    efektif = biaya / (P * T) * 100
    L = _d(reg.patokan_rasio_persen)
    b = reg.batas_harian_untuk(m.segmen, T, float(P))
    batas_total = reg.batas_total_persen

    return Hasil(
        bunga=float(bunga),
        admin=float(admin),
        diterima=float(diterima),
        total=float(total),
        biaya=float(biaya),
        biaya_persen_pokok=float(biaya / P * 100),
        jumlah_cicilan=n,
        cicilan=float(cicilan),
        rasio_sendiri_persen=None if rasio_sendiri is None else float(rasio_sendiri),
        rasio_persen=None if rasio is None else float(rasio),
        patokan_persen=float(L),
        di_atas_patokan=None if rasio is None else rasio > L + EPS,
        bunga_harian_persen=float(m.bunga_harian_persen),
        efektif_harian_persen=float(efektif),
        batas_tipe=b.tipe,
        batas_persen=b.persen,
        batas_min=b.min,
        batas_maks=b.maks,
        status_batas=posisi_batas(_d(m.bunga_harian_persen), efektif, b, reg.admin_termasuk),
        batas_total_persen=batas_total,
        di_atas_batas_total=None if batas_total is None else biaya / P * 100 > _d(batas_total) + EPS,
        versi_parameter=reg.id,
    )


# --- Uji tekanan (CEK-13) ---------------------------------------------------------

PENURUNAN_UJI = (0, 10, 20, 30, 40)


@dataclass(frozen=True)
class BarisTekanan:
    penurunan_persen: int
    penghasilan: float
    total_cicilan: float
    rasio_persen: float
    di_atas_patokan: bool


def uji_tekanan(
    penghasilan: float | None,
    total_cicilan: float,
    regulasi: VersiRegulasi | None = None,
    penurunan: tuple[int, ...] = PENURUNAN_UJI,
) -> list[BarisTekanan]:
    """rasio_d = (cicilan + K) / (I x (1 - d)). Kosong bila penghasilan nol."""
    if not penghasilan or penghasilan <= 0 or total_cicilan < 0:
        return []
    reg = regulasi or versi_aktif()
    L = _d(reg.patokan_rasio_persen)
    hasil = []
    for p in penurunan:
        I = _d(penghasilan) * (100 - _d(p)) / 100
        rasio = _d(total_cicilan) / I * 100
        hasil.append(BarisTekanan(p, float(I), float(total_cicilan), float(rasio), rasio > L + EPS))
    return hasil


# --- Kontrafaktual (PRD 6.5) ------------------------------------------------------


def kontrafaktual(m: Masukan, h: Hasil) -> dict:
    """Satu variabel pada satu waktu, syarat lain tetap; tanpa kontrafaktual tenor.

    Pembulatan ke arah aman: pokok ke bawah kelipatan Rp1.000, penghasilan ke atas.
    """
    if not m.penghasilan or h.rasio_persen is None:
        return {"jenis": "tanpa_penghasilan"}
    I = _d(m.penghasilan)
    K = _d(m.cicilan_lain or 0)
    L = _d(h.patokan_persen) / 100
    batas_rupiah = L * I
    cicilan = _d(h.cicilan)
    if not h.di_atas_patokan:
        return {"jenis": "ruang", "ruang_cicilan": float(batas_rupiah - (cicilan + K))}
    if batas_rupiah - K <= 0:
        return {"jenis": "tidak_ada"}
    r = _d(m.bunga_harian_persen) / 100
    p_maks = (batas_rupiah - K) * h.jumlah_cicilan / (1 + r * m.tenor)
    k_maks = batas_rupiah - cicilan
    i_min = (cicilan + K) / L
    return {
        "jenis": "ubah",
        "pokok_maks_mentah": float(p_maks),
        "pokok_maks": int(math.floor(float(p_maks) / 1000 + 1e-9) * 1000),
        "cicilan_lain_maks": int(math.floor(float(k_maks) + 1e-9)) if k_maks >= 0 else None,
        "penghasilan_min_mentah": float(i_min),
        "penghasilan_min": int(math.ceil(float(i_min) / 1000 - 1e-9) * 1000),
    }
