"""Batas pemakaian sederhana di memori untuk endpoint AI (PRD: tahap 2 dengan batas pemakaian)."""

from __future__ import annotations

import hashlib
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import settings

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def _kunci(request: Request) -> str:
    # IP hanya di-hash di memori untuk pembatas, tidak pernah disimpan.
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "?"
    )
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def batasi_ai(request: Request) -> None:
    now = time.monotonic()
    key = _kunci(request)
    with _lock:
        q = _hits[key]
        while q and now - q[0] > settings.ai_rate_window_s:
            q.popleft()
        if len(q) >= settings.ai_rate_limit:
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi, atau isi kolom secara manual.",
            )
        q.append(now)


def batasi(request: Request, kunci: str, maks: int, jendela_s: int) -> None:
    """Pembatas umum (NFR-06: batas laju), mis. untuk tautan masuk per email dan per klien."""
    now = time.monotonic()
    key = f"{kunci}:{_kunci(request)}"
    with _lock:
        q = _hits[key]
        while q and now - q[0] > jendela_s:
            q.popleft()
        if len(q) >= maks:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.")
        q.append(now)


def reset() -> None:
    with _lock:
        _hits.clear()
