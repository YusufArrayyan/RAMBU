import json
import random
from datetime import date
from pathlib import Path

import pytest

from app.engine import Masukan, hitung, kontrafaktual, uji_tekanan
from app.formatting import parse_angka_id, persen, rupiah
from app.regulasi import versi_aktif

GOLDEN = json.loads((Path(__file__).resolve().parents[2] / "shared" / "golden.json").read_text(encoding="utf-8"))
REG = versi_aktif(date.fromisoformat(GOLDEN["tanggal_acuan"]))


def _masukan(d: dict) -> Masukan:
    return Masukan(
        pokok=d["pokok"],
        tenor=d["tenor"],
        bunga_harian_persen=d["bunga_harian_persen"],
        admin_persen=d["admin_persen"],
        penghasilan=d["penghasilan"],
        cicilan_lain=d["cicilan_lain"],
        segmen=d.get("segmen", "konsumtif_mikro"),
    )


def _kasus(nama: str) -> Masukan:
    return _masukan(next(k for k in GOLDEN["kasus"] if k["nama"] == nama)["masukan"])


def _cocok(hasil, harapan: dict):
    for k, v in harapan.items():
        aktual = getattr(hasil, k)
        if isinstance(v, float) and aktual is not None:
            assert aktual == pytest.approx(v, abs=1e-3), k
        else:
            assert aktual == v, k


@pytest.mark.parametrize("kasus", GOLDEN["kasus"], ids=lambda k: k["nama"])
def test_golden(kasus):
    h = hitung(_masukan(kasus["masukan"]), REG)
    assert h is not None
    _cocok(h, kasus["harapan"])
    t = kasus["tampilan"]
    assert rupiah(h.diterima) == t["diterima"]
    assert rupiah(h.total) == t["total"]
    assert rupiah(h.biaya) == t["biaya"]
    assert rupiah(h.cicilan) == t["cicilan"]
    assert persen(h.rasio_sendiri_persen, 1) == t["rasio_sendiri"]
    assert persen(h.rasio_persen, 1) == t["rasio"]
    assert persen(h.efektif_harian_persen, 3) == t["efektif"]
    assert h.versi_parameter == "2026.10.1"


@pytest.mark.parametrize("kasus", GOLDEN["tepi"], ids=lambda k: k["nama"])
def test_tepi(kasus):
    h = hitung(_masukan(kasus["masukan"]), REG)
    if kasus["harapan"] is None:
        assert h is None
    else:
        _cocok(h, kasus["harapan"])


def test_uji_tekanan_golden():
    g = GOLDEN["uji_tekanan"]
    baris = uji_tekanan(g["penghasilan"], g["total_cicilan"], REG)
    assert [round(b.rasio_persen, 2) for b in baris] == g["rasio_persen"]
    assert all(b.di_atas_patokan for b in baris)


def test_kontrafaktual_golden():
    g = GOLDEN["kontrafaktual"]
    m = _kasus(g["kasus"])
    k = kontrafaktual(m, hitung(m, REG))
    assert k["jenis"] == "ubah"
    assert k["pokok_maks_mentah"] == pytest.approx(g["pokok_maks_mentah"], abs=0.01)
    assert k["pokok_maks"] == g["pokok_maks"]
    assert k["cicilan_lain_maks"] == g["cicilan_lain_maks"]
    assert k["penghasilan_min"] == g["penghasilan_min"]
    assert hitung(Masukan(**{**m.__dict__, "pokok": k["pokok_maks"]}), REG).di_atas_patokan is False


def test_kontrafaktual_properti():
    """XAI-10: nilai kontrafaktual yang dimasukkan kembali tidak melewati patokan."""
    rng = random.Random(20261005)
    diuji = 0
    for _ in range(2000):
        m = Masukan(
            pokok=rng.randint(500_000, 20_000_000),
            tenor=rng.choice([7, 15, 30, 45, 60, 90, 120, 180, 200, 270, 360]),
            bunga_harian_persen=round(rng.random() * 0.4, 3),
            admin_persen=round(rng.random() * 10, 2),
            penghasilan=rng.randint(1_500_000, 15_000_000),
            cicilan_lain=rng.choice([0, 0, 150_000, 300_000, 750_000, 1_500_000]),
        )
        h = hitung(m, REG)
        k = kontrafaktual(m, h)
        if k["jenis"] != "ubah":
            continue
        diuji += 1
        d = m.__dict__
        assert hitung(Masukan(**{**d, "pokok": k["pokok_maks"]}), REG).rasio_persen <= 30 + 1e-9
        assert hitung(Masukan(**{**d, "penghasilan": k["penghasilan_min"]}), REG).rasio_persen <= 30 + 1e-9
        if k["cicilan_lain_maks"] is not None:
            assert hitung(Masukan(**{**d, "cicilan_lain": k["cicilan_lain_maks"]}), REG).rasio_persen <= 30 + 1e-9
        assert hitung(Masukan(**{**d, "pokok": k["pokok_maks"] + 1000}), REG).rasio_persen > 30
    assert diuji > 200


def test_biaya_sama_dengan_bunga_tambah_admin():
    h = hitung(Masukan(2_500_000, 45, 0.15, 4, 3_500_000), REG)
    assert h.biaya == pytest.approx(h.bunga + h.admin)
    assert h.jumlah_cicilan == 2


def test_parameter_dibuang_v4_tidak_dipakai():
    raw = REG.mentah
    assert "batas_total_manfaat_persen" not in raw
    assert {n["nama"] for n in raw["nonaktif"]} >= {"Batas total manfaat 100% dari pokok", "Rasio cicilan 40% pada 2025"}
    assert all(b["sumber"] for b in raw["batas_harian"])


def test_format():
    assert rupiah(3810000) == "Rp3.810.000"
    assert rupiah(1269999.6) == "Rp1.270.000"
    assert persen(31.75, 1) == "31,8%"
    assert persen(0.3, 2) == "0,3%"
    assert persen(30, 0) == "30%"
    assert parse_angka_id("3.810.000") == 3810000
    assert parse_angka_id("31,8") == 31.8
    assert parse_angka_id("0,36") == 0.36
    assert parse_angka_id("90") == 90
