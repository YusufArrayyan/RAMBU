"""Kunci, enkripsi saat disimpan (NFR-06), dan hash untuk token sekali pakai."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet

from .config import settings


@lru_cache(maxsize=1)
def _kunci_induk() -> bytes:
    if settings.secret_key:
        return hashlib.sha256(settings.secret_key.encode()).digest()
    if settings.produksi:
        raise RuntimeError("RAMBU_SECRET_KEY wajib diisi di produksi.")
    path = Path(settings.keys_dir) / "secret.key"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(secrets.token_bytes(32))
    return path.read_bytes()


def _turunan(label: str) -> bytes:
    return hmac.new(_kunci_induk(), label.encode(), hashlib.sha256).digest()


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(base64.urlsafe_b64encode(_turunan("enkripsi-data-akun")))


def enkripsi(teks: str) -> bytes:
    return _fernet().encrypt(teks.encode("utf-8"))


def dekripsi(data: bytes) -> str:
    return _fernet().decrypt(data).decode("utf-8")


def hash_hmac(nilai: str, label: str = "umum") -> str:
    """Hash deterministik untuk pencarian (email) dan token. Tidak bisa dibalik."""
    return hmac.new(_turunan(label), nilai.encode("utf-8"), hashlib.sha256).hexdigest()


def token_acak(n: int = 32) -> str:
    return secrets.token_urlsafe(n)


def kode_6_digit() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def sama(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
