"""Klien Anthropic bersama untuk fitur tahap 2."""

from __future__ import annotations

from functools import lru_cache

import anthropic

from .config import settings


@lru_cache(maxsize=1)
def client() -> anthropic.Anthropic:
    # PRD (FR-26): model hanya dipanggil atas tindakan pengguna, tanpa percobaan ulang otomatis.
    # Tanpa kunci eksplisit, SDK membaca kredensial dari lingkungan / profil `ant auth login`.
    if settings.anthropic_api_key:
        return anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=60.0, max_retries=0)
    return anthropic.Anthropic(timeout=60.0, max_retries=0)


def refused(response) -> bool:
    return getattr(response, "stop_reason", None) == "refusal"


def text_of(response) -> str:
    return "".join(b.text for b in response.content if getattr(b, "type", None) == "text")
