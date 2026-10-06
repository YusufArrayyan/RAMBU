"""Parameter regulasi berversi (PRD v4 12.1), dibaca dari shared/regulasi.json.

Setiap parameter membawa sumber dan status. Parameter tanpa sumber berstatus nonaktif.
Versi baru diterbitkan lewat aturan dua orang (lihat routes/admin.py).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path

from .config import settings

SEGMEN = ("konsumtif", "produktif")


def normal_segmen(s):
    """Id segmen lama (versi 2026.10.1: konsumtif_mikro, konsumtif_kecil) menjadi konsumtif; nilai lain apa adanya."""
    return "konsumtif" if s in ("konsumtif_mikro", "konsumtif_kecil") else s


@dataclass(frozen=True)
class BarisBatas:
    id: str
    segmen: str
    tenor_maks_hari: int | None
    persen: float | None
    persen_min: float | None
    persen_maks: float | None
    sumber: str
    status: str
    pokok_maks: float | None = None


@dataclass(frozen=True)
class Batas:
    tipe: str  # "tunggal" | "rentang"
    persen: float | None
    min: float | None
    maks: float | None
    baris: BarisBatas


@dataclass(frozen=True)
class VersiRegulasi:
    id: str
    berlaku_mulai: date
    status: str
    batas_harian: tuple[BarisBatas, ...]
    patokan_rasio_persen: float
    mentah: dict
    admin_termasuk: bool = False
    batas_total_persen: float | None = None

    def batas_harian_untuk(self, segmen: str, tenor: int, pokok: float = 0) -> Batas:
        cocok = next(
            (
                b
                for b in self.batas_harian
                if b.status != "nonaktif"
                and b.segmen in (segmen, "semua")
                and (b.pokok_maks is None or pokok <= b.pokok_maks)
                and (b.tenor_maks_hari is None or tenor <= b.tenor_maks_hari)
            ),
            self.batas_harian[-1],
        )
        if cocok.persen is not None:
            return Batas("tunggal", cocok.persen, None, None, cocok)
        return Batas("rentang", None, cocok.persen_min, cocok.persen_maks, cocok)


def _baca(path: str) -> dict:
    with Path(path).open(encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def muat_berkas() -> dict:
    return _baca(settings.regulasi_path)


def parse(v: dict) -> VersiRegulasi:
    return VersiRegulasi(
        id=v["id"],
        berlaku_mulai=date.fromisoformat(v["berlaku_mulai"]),
        status=v.get("status", "terbit"),
        batas_harian=tuple(
            BarisBatas(
                id=b["id"],
                segmen=b["segmen"],
                tenor_maks_hari=b.get("tenor_maks_hari"),
                persen=b.get("persen"),
                persen_min=b.get("persen_min"),
                persen_maks=b.get("persen_maks"),
                sumber=b["sumber"],
                status=b["status"],
                pokok_maks=b.get("pokok_maks"),
            )
            for b in v["batas_harian"]
        ),
        patokan_rasio_persen=float(v["patokan_rasio"]["persen"]),
        mentah=v,
        admin_termasuk=(v.get("admin_termasuk_batas") or {}).get("nilai") is True,
        batas_total_persen=float(v["batas_total"]["persen"]) if v.get("batas_total") else None,
    )


# Versi yang diterbitkan lewat panel admin (aturan dua orang) ditambahkan saat berjalan.
_versi_db: list[dict] = []


def set_versi_db(versi: list[dict]) -> None:
    global _versi_db
    _versi_db = list(versi)


def semua_versi_mentah() -> list[dict]:
    per_id = {v["id"]: v for v in muat_berkas()["versi"]}
    for v in _versi_db:
        per_id[v["id"]] = v
    return list(per_id.values())


def semua_versi() -> list[VersiRegulasi]:
    # Urut tanggal berlaku, lalu tanggal terbit, agar versi terbaru menang bila berlaku di hari yang sama.
    return sorted((parse(v) for v in semua_versi_mentah()), key=lambda v: (v.berlaku_mulai, v.mentah.get("diterbitkan", "")))


def versi_aktif(pada: date | None = None) -> VersiRegulasi:
    """Versi terbit terbaru yang tanggal berlakunya tidak melewati `pada` (bawaan: hari ini)."""
    pada = pada or date.today()
    terbit = [v for v in semua_versi() if v.status == "terbit"]
    aktif = [v for v in terbit if v.berlaku_mulai <= pada]
    return aktif[-1] if aktif else terbit[0]


def kanal_pengaduan() -> dict:
    return muat_berkas()["kanal_pengaduan"]
