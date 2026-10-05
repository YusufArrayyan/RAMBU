"""Pemeriksa keluaran AI (FR-25). Kode, bukan model.

Menolak jawaban yang:
- memuat angka di luar keluaran mesin hitung, hasil alat, atau ucapan pengguna;
- memakai singkatan "juta" atau "ribu" (angka harus ditulis utuh, mis. Rp1.270.000);
- memuat kalimat yang menyuruh meminjam atau tidak, janji hasil, atau tuduhan pada penyelenggara.

Batas yang diakui PRD: pemeriksa memastikan angka berasal dari mesin, tetapi tidak
memastikan angka itu ditempatkan pada makna yang benar. Karena itu hasil mesin
selalu ditampilkan berdampingan di layar.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field

from .formatting import angka_dalam_teks, parse_angka_id

_ANGKA = re.compile(r"\d+(?:[.,]\d+)*")
_SINGKATAN = re.compile(r"\b(juta|jt|ribu|rb|miliar|triliun)\b", re.IGNORECASE)

_FRASA_TERLARANG = [
    r"\b(sebaiknya|seharusnya|lebih baik|disarankan|sarankan|saran(?:ku|nya)?|rekomendasi|rekomendasikan|anjurkan)\b",
    r"\b(jangan|ayo|silakan|segera)\s+(meminjam|pinjam|ambil|ajukan|setujui|tolak)\b",
    r"\b(pinjam|ambil|ajukan|setujui)(lah)?\s+(saja|sekarang)\b",
    r"\b(pasti|dijamin|jaminan|garansi|tanpa risiko|aman 100)\b",
    r"\b(ilegal|melanggar|penipu|penipuan|rentenir)\b",
]


@dataclass
class HasilPeriksa:
    lolos: bool
    alasan: list[str] = field(default_factory=list)


def kumpulkan_angka(*sumber: Iterable[str | float | int | None]) -> set[float]:
    """Gabungkan angka yang boleh muncul dari teks berformat dan nilai mentah."""
    boleh: set[float] = set()
    for kumpulan in sumber:
        for s in kumpulan:
            if s is None:
                continue
            if isinstance(s, (int, float)):
                boleh.add(round(float(s), 4))
                continue
            for v in angka_dalam_teks(str(s)):
                boleh.add(round(v, 4))
    return boleh


def periksa_teks(teks: str, angka_boleh: set[float], maks_karakter: int = 1200) -> HasilPeriksa:
    alasan: list[str] = []
    asing = []
    for token in _ANGKA.findall(teks):
        v = parse_angka_id(token)
        if v is None or round(v, 4) not in angka_boleh:
            asing.append(token)
    if asing:
        alasan.append("memuat angka yang tidak ada di hasil mesin hitung: " + ", ".join(dict.fromkeys(asing)))

    if _SINGKATAN.search(teks):
        alasan.append("memakai singkatan seperti juta atau ribu, bukan angka utuh")

    rendah = teks.lower()
    for pola in _FRASA_TERLARANG:
        cocok = re.search(pola, rendah)
        if cocok:
            alasan.append(f"memuat kalimat anjuran atau penilaian: “{cocok.group(0)}”")

    if len(teks) > maks_karakter:
        alasan.append("terlalu panjang")
    if not teks.strip():
        alasan.append("kosong")
    return HasilPeriksa(lolos=not alasan, alasan=alasan)
