"""Format angka gaya Indonesia: Rp3.810.000, 31,8%, 0,36%."""

from __future__ import annotations

import re
from decimal import ROUND_HALF_UP, Decimal


def _group(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def rupiah(x: float) -> str:
    n = int(Decimal(str(x)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    sign = "-" if n < 0 else ""
    return f"{sign}Rp{_group(abs(n))}"


def angka(x: float, desimal: int = 0) -> str:
    q = Decimal(1).scaleb(-desimal) if desimal else Decimal("1")
    d = Decimal(str(x)).quantize(q, rounding=ROUND_HALF_UP)
    whole, _, frac = f"{abs(d):f}".partition(".")
    out = _group(int(whole)) + ("," + frac if frac else "")
    return ("-" if d < 0 else "") + out


def persen(x: float, desimal: int = 1) -> str:
    s = angka(x, desimal)
    if "," in s:
        s = s.rstrip("0").rstrip(",")
    return f"{s}%"


def parse_angka_id(teks: str) -> float | None:
    """Ubah '3.810.000', '31,8', '0,36' menjadi float. Mengembalikan None jika gagal."""
    t = teks.strip().replace("Rp", "").replace(" ", "").rstrip("%")
    if not t:
        return None
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    elif t.count(".") >= 1 and all(len(g) == 3 for g in t.split(".")[1:]):
        t = t.replace(".", "")  # titik sebagai pemisah ribuan
    try:
        return float(t)
    except ValueError:
        return None


_POLA_ANGKA = re.compile(r"(\d+(?:[.,]\d+)*)(?:\s*(juta|jt|ribu|rb|k)\b)?", re.IGNORECASE)
_PENGALI = {"juta": 1_000_000, "jt": 1_000_000, "ribu": 1_000, "rb": 1_000, "k": 1_000}


def angka_dalam_teks(teks: str) -> list[float]:
    """Semua angka dalam teks, termasuk bentuk dengan pengali ("1,9 juta" -> 1,9 dan 1.900.000).

    Dipakai untuk memverifikasi bahwa angka yang dibaca AI memang ada di kutipan
    atau di ucapan pengguna.
    """
    hasil: list[float] = []
    for m in _POLA_ANGKA.finditer(teks):
        v = parse_angka_id(m.group(1))
        if v is None:
            continue
        hasil.append(v)
        if m.group(2):
            hasil.append(v * _PENGALI[m.group(2).lower()])
    return hasil


def sama(a: float, b: float) -> bool:
    return abs(a - b) <= max(1e-6, abs(b) * 1e-9)
