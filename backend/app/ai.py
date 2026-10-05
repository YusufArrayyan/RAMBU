"""Klien model bahasa bersama untuk fitur AI.

Dua penyedia didukung lewat satu antarmuka yang sama, `client().beta.messages.create(...)`:
- Anthropic (bawaan), lewat SDK resmi.
- Gemini (RAMBU_AI_PROVIDER=gemini), lewat adaptor REST di bawah yang menerjemahkan permintaan
  dan jawaban ke bentuk yang sama, sehingga pemeriksa keluaran, verifikator kutipan, dan validasi
  alat tidak berubah: AI mengusulkan, kode memverifikasi.

PRD DOK-06 / NFR-10: model hanya dipanggil atas tindakan pengguna, tanpa percobaan ulang otomatis.
"""

from __future__ import annotations

import json
import logging
import uuid
from functools import lru_cache
from types import SimpleNamespace
from typing import Any

from .config import settings

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def client():
    if settings.ai_provider == "gemini":
        return KlienGemini(settings.gemini_api_key, settings.gemini_model, settings.gemini_model_cadangan)
    import anthropic

    # Tanpa kunci eksplisit, SDK membaca kredensial dari lingkungan / profil `ant auth login`.
    if settings.anthropic_api_key:
        return anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=60.0, max_retries=0)
    return anthropic.Anthropic(timeout=60.0, max_retries=0)


def refused(response) -> bool:
    return getattr(response, "stop_reason", None) == "refusal"


def text_of(response) -> str:
    return "".join(b.text for b in response.content if getattr(b, "type", None) == "text")


# --- Adaptor Gemini -----------------------------------------------------------------

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GalatGemini(RuntimeError):
    pass


def _get(blok: Any, kunci: str, bawaan: Any = None) -> Any:
    """Blok bisa berupa dict (dibuat pemanggil) atau SimpleNamespace (jawaban sebelumnya)."""
    return blok.get(kunci, bawaan) if isinstance(blok, dict) else getattr(blok, kunci, bawaan)


class _Pesan:
    def __init__(self, kunci: str, model: str, cadangan: list[str]):
        self._kunci = kunci
        self._model = model
        # Model cadangan saat model utama kelebihan beban, padanan server-side fallback Anthropic.
        # Ini perpindahan model sekali jalan, bukan percobaan ulang otomatis (NFR-10).
        self._cadangan = [m for m in cadangan if m and m != model]

    def _isi(self, messages: list[dict]) -> list[dict]:
        """Terjemahkan pesan gaya Anthropic ke `contents` Gemini."""
        nama_alat: dict[str, str] = {}
        contents: list[dict] = []
        for m in messages:
            peran = "model" if m["role"] == "assistant" else "user"
            isi = m["content"]
            if isinstance(isi, str):
                contents.append({"role": peran, "parts": [{"text": isi}]})
                continue
            parts: list[dict] = []
            asli_dipakai = set()
            for b in isi:
                jenis = _get(b, "type")
                asli = _get(b, "_bagian_asli")
                if asli is not None:
                    # Bagian jawaban Gemini sebelumnya dikirim balik apa adanya (termasuk thoughtSignature).
                    if id(asli) not in asli_dipakai:
                        parts.extend(asli)
                        asli_dipakai.add(id(asli))
                    if jenis == "tool_use":
                        nama_alat[_get(b, "id")] = _get(b, "name")
                    continue
                if jenis == "text":
                    parts.append({"text": _get(b, "text")})
                elif jenis == "image":
                    src = _get(b, "source")
                    parts.append({"inlineData": {"mimeType": src["media_type"], "data": src["data"]}})
                elif jenis == "tool_use":
                    nama_alat[_get(b, "id")] = _get(b, "name")
                    parts.append({"functionCall": {"name": _get(b, "name"), "args": _get(b, "input") or {}}})
                elif jenis == "tool_result":
                    hasil = _get(b, "content")
                    try:
                        data = json.loads(hasil) if isinstance(hasil, str) else hasil
                    except json.JSONDecodeError:
                        data = {"teks": hasil}
                    if not isinstance(data, dict):
                        data = {"hasil": data}
                    if _get(b, "is_error"):
                        data = {"galat": True, **data}
                    parts.append({"functionResponse": {"name": nama_alat.get(_get(b, "tool_use_id"), "alat"), "response": data}})
            contents.append({"role": peran, "parts": parts})
        return contents

    def create(
        self,
        *,
        model: str | None = None,
        max_tokens: int = 4000,
        system: str | None = None,
        messages: list[dict],
        tools: list[dict] | None = None,
        tool_choice: dict | None = None,
        output_config: dict | None = None,
        **_abaikan: Any,  # betas, fallbacks: khusus Anthropic
    ):
        import httpx

        body: dict[str, Any] = {
            "contents": self._isi(messages),
            # Token berpikir ikut dihitung; beri ruang agar jawaban tidak terpotong.
            "generationConfig": {"maxOutputTokens": max(int(max_tokens), 8192), "temperature": 0.2},
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        fmt = (output_config or {}).get("format") or {}
        if fmt.get("type") == "json_schema":
            body["generationConfig"]["responseMimeType"] = "application/json"
            body["generationConfig"]["responseJsonSchema"] = fmt["schema"]
        if tools:
            body["tools"] = [
                {"functionDeclarations": [{"name": t["name"], "description": t.get("description", ""), "parametersJsonSchema": t["input_schema"]} for t in tools]}
            ]
            mode = "ANY" if (tool_choice or {}).get("type") in ("any", "tool") else "AUTO"
            body["toolConfig"] = {"functionCallingConfig": {"mode": mode}}
        r = None
        for i, nama_model in enumerate([self._model, *self._cadangan]):
            try:
                r = httpx.post(GEMINI_URL.format(model=nama_model), headers={"x-goog-api-key": self._kunci}, json=body, timeout=30.0)
            except httpx.TimeoutException:
                log.warning("gemini %s: waktu habis", nama_model)
                r = None
                continue
            except httpx.HTTPError as exc:
                raise GalatGemini(f"jaringan: {type(exc).__name__}") from exc
            if r.status_code == 200:
                if i:
                    log.info("gemini: memakai model cadangan %s", nama_model)
                return self._jawaban(r.json())
            # Hanya status dan kode galat yang dicatat, tidak pernah isi permintaan.
            try:
                status = r.json().get("error", {}).get("status", "")
            except ValueError:
                status = ""
            log.warning("gemini %s: HTTP %s %s", nama_model, r.status_code, status)
            # Kelebihan beban atau model tidak tersedia untuk kunci ini: coba model cadangan berikutnya.
            if r.status_code not in (404, 429, 500, 503, 504):
                break
        raise GalatGemini(f"HTTP {r.status_code if r is not None else '?'}")

    @staticmethod
    def _jawaban(data: dict):
        if (data.get("promptFeedback") or {}).get("blockReason"):
            return SimpleNamespace(content=[], stop_reason="refusal")
        kandidat = (data.get("candidates") or [{}])[0]
        alasan = kandidat.get("finishReason", "STOP")
        parts = (kandidat.get("content") or {}).get("parts") or []
        blok: list[SimpleNamespace] = []
        ada_alat = False
        for p in parts:
            if p.get("thought"):
                continue  # ringkasan berpikir tidak pernah ditampilkan
            if "functionCall" in p:
                ada_alat = True
                fc = p["functionCall"]
                blok.append(SimpleNamespace(type="tool_use", id=fc.get("id") or f"g_{uuid.uuid4().hex[:10]}", name=fc["name"], input=fc.get("args") or {}, _bagian_asli=parts))
            elif "text" in p:
                blok.append(SimpleNamespace(type="text", text=p["text"], _bagian_asli=parts))
        if alasan in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"):
            return SimpleNamespace(content=[], stop_reason="refusal")
        stop = "tool_use" if ada_alat else ("max_tokens" if alasan == "MAX_TOKENS" else "end_turn")
        return SimpleNamespace(content=blok, stop_reason=stop)


class KlienGemini:
    """Meniru bentuk `anthropic.Anthropic().beta.messages.create` untuk Gemini."""

    def __init__(self, kunci: str, model: str, cadangan: list[str] | None = None):
        self.beta = SimpleNamespace(messages=_Pesan(kunci, model, cadangan or []))
        self.messages = self.beta.messages


__all__ = ["client", "refused", "text_of", "KlienGemini", "GalatGemini"]
