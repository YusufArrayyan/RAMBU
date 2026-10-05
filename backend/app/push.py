"""Web Push untuk pengingat mode akun (ING-05). Kunci VAPID dari lingkungan, atau dibuat di
backend/.keys pada pengembangan. Isi notifikasi mengikuti mode privasi pengguna (ING-04).
"""

from __future__ import annotations

import base64
import json
import logging
from functools import lru_cache
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from .config import settings

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _kunci_privat() -> ec.EllipticCurvePrivateKey | None:
    if settings.vapid_private_key:
        try:
            return serialization.load_pem_private_key(settings.vapid_private_key.replace("\\n", "\n").encode(), password=None)  # type: ignore[return-value]
        except ValueError:
            log.warning("RAMBU_VAPID_PRIVATE_KEY tidak bisa dibaca; push dimatikan")
            return None
    if settings.produksi:
        return None  # produksi wajib menyetel kunci sendiri
    path = Path(settings.keys_dir) / "vapid.pem"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        k = ec.generate_private_key(ec.SECP256R1())
        path.write_bytes(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    return serialization.load_pem_private_key(path.read_bytes(), password=None)  # type: ignore[return-value]


def push_tersedia() -> bool:
    return settings.akun_enabled and _kunci_privat() is not None


def kunci_publik() -> str | None:
    """Kunci publik VAPID (titik tak terkompresi, base64url) untuk pushManager.subscribe."""
    k = _kunci_privat()
    if k is None:
        return None
    mentah = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(mentah).rstrip(b"=").decode()


def _pem() -> str:
    k = _kunci_privat()
    assert k is not None
    return k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()


def kirim_push(langganan: dict, judul: str, isi: str, url: str, tag: str) -> str:
    """Kembalikan "terkirim", "hilang" (langganan kedaluwarsa, hapus), atau "gagal"."""
    if not push_tersedia():
        return "gagal"
    from pywebpush import WebPushException, webpush
    from py_vapid import Vapid

    try:
        webpush(
            subscription_info=langganan,
            data=json.dumps({"judul": judul, "isi": isi, "url": url, "tag": tag}, ensure_ascii=False),
            vapid_private_key=Vapid.from_pem(_pem().encode()),
            vapid_claims={"sub": settings.vapid_subject},
            ttl=12 * 3600,
            timeout=10,
        )
        return "terkirim"
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in (404, 410):
            return "hilang"
        log.warning("push gagal: %s", status)
        return "gagal"
    except Exception as exc:  # jaringan dsb.
        log.warning("push gagal: %s", type(exc).__name__)
        return "gagal"
