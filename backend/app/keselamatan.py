"""Deteksi kalimat yang menyiratkan keinginan menyakiti diri (CIC-04, PRD 7.9).

Sama dengan frontend/src/lib/keselamatan.ts. Daftar kata dan ambang final disusun bersama
klinisi (PERLU DATA). Daftar sementara ini sengaja gagal-aman: lebih baik menampilkan
bantuan berlebih daripada terlewat (PRD 13.3).
"""

from __future__ import annotations

import re
import unicodedata

_POLA = [
    r"bunuh\s*diri",
    r"akhir(i|in)\s*(hidup|nyawa)",
    r"mengakhiri\s*(hidup|nyawa)",
    r"(ingin|pengen|pingin|mau|lebih\s*baik)\s*(aku\s*|saya\s*|gw\s*|gue\s*)?mati",
    r"(tidak|nggak|ngga|gak|ga|enggak)\s*(ingin|mau|pengen|kuat)\s*(hidup|lagi\s*hidup)",
    r"(menyakiti|melukai|nyakitin|lukai)\s*diri",
    r"(gantung|minum\s*racun|loncat\s*dari)",
    r"hidup\s*(ini\s*)?(tidak|nggak|gak|ga)\s*(ada\s*)?(guna|artinya|berarti)",
    r"\b(suicide|kill\s*myself|end\s*my\s*life)\b",
]
_RE = [re.compile(p, re.IGNORECASE) for p in _POLA]


def menyiratkan_menyakiti_diri(teks: str) -> bool:
    t = unicodedata.normalize("NFKC", teks)
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return any(p.search(t) for p in _RE)
