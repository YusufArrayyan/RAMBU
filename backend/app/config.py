"""Konfigurasi dari variabel lingkungan. Lihat .env.example."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

try:  # .env opsional saat pengembangan lokal
    from dotenv import load_dotenv

    load_dotenv(ROOT / "backend" / ".env")
except ImportError:  # pragma: no cover
    pass


def _env(name: str, default: str) -> str:
    """Nilai kosong di .env diperlakukan sama dengan tidak diisi."""
    return os.getenv(name) or default


def _list(name: str, default: str) -> list[str]:
    return [s.strip() for s in _env(name, default).split(",") if s.strip()]


@dataclass(frozen=True)
class Settings:
    regulasi_path: str = _env("RAMBU_REGULASI_PATH", str(ROOT / "shared" / "regulasi.json"))
    database_url: str = _env("RAMBU_DATABASE_URL", f"sqlite:///{ROOT / 'backend' / 'rambu.db'}")
    cors_origins: list[str] = field(
        default_factory=lambda: _list("RAMBU_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    )
    admin_token: str = _env("RAMBU_ADMIN_TOKEN", "")
    # Tahap 2 (AI). Fitur AI aktif hanya bila kunci API tersedia dan tidak dimatikan.
    # Bawaan mati: kunci API di lingkungan tidak boleh mengaktifkan AI tanpa disengaja.
    ai_enabled_flag: bool = _env("RAMBU_AI_ENABLED", "false").lower() in {"1", "true", "yes"}
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    # Penyedia model: "anthropic" (bawaan) atau "gemini" (tingkat gratis Google AI Studio).
    ai_provider: str = _env("RAMBU_AI_PROVIDER", "anthropic").strip().lower()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = _env("RAMBU_GEMINI_MODEL", "gemini-flash-latest")
    gemini_model_cadangan: list[str] = field(default_factory=lambda: _list("RAMBU_GEMINI_MODEL_CADANGAN", "gemini-flash-lite-latest,gemini-3.5-flash-lite"))
    model: str = _env("RAMBU_MODEL", "claude-opus-5-5")
    ai_rate_limit: int = int(_env("RAMBU_AI_RATE_LIMIT", "12"))  # permintaan per jendela per klien
    ai_rate_window_s: int = int(_env("RAMBU_AI_RATE_WINDOW", "600"))
    max_upload_bytes: int = int(_env("RAMBU_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
    static_dir: str = _env("RAMBU_STATIC_DIR", str(ROOT / "frontend" / "dist"))
    # v4: lingkungan, akun, email, pengingat
    lingkungan: str = _env("RAMBU_ENV", "development")  # development | production
    secret_key: str = _env("RAMBU_SECRET_KEY", "")  # kosong: dibuat di folder kunci (keys_dir)
    # Folder kunci yang dibuat otomatis (enkripsi data akun, VAPID). Di Docker: volume /data.
    keys_dir: str = _env("RAMBU_KEYS_DIR", str(ROOT / "backend" / ".keys"))
    akun_enabled: bool = _env("RAMBU_AKUN_ENABLED", "true").lower() in {"1", "true", "yes"}
    # Alamat publik aplikasi (tautan masuk, pengingat). Di Render terisi otomatis dari RENDER_EXTERNAL_URL.
    app_url: str = _env("RAMBU_APP_URL", os.getenv("RENDER_EXTERNAL_URL") or "http://localhost:5173")
    smtp_host: str = _env("RAMBU_SMTP_HOST", "")
    smtp_port: int = int(_env("RAMBU_SMTP_PORT", "587"))
    smtp_user: str = _env("RAMBU_SMTP_USER", "")
    smtp_password: str = _env("RAMBU_SMTP_PASSWORD", "")
    smtp_from: str = _env("RAMBU_SMTP_FROM", "RAMBU <noreply@rambu.local>")
    pengingat_interval_s: int = int(_env("RAMBU_PENGINGAT_INTERVAL", "300"))
    # Web Push: kunci privat VAPID (PEM). Kosong di pengembangan: dibuat di backend/.keys.
    vapid_private_key: str = _env("RAMBU_VAPID_PRIVATE_KEY", "")
    vapid_subject: str = _env("RAMBU_VAPID_SUBJECT", "mailto:tim@rambu.local")
    # Data contoh untuk panel admin (hanya pengembangan): admin dan versi parameter rekaan.
    seed_contoh: bool = _env("RAMBU_SEED_CONTOH", "true").lower() in {"1", "true", "yes"}
    # Demo publik: token admin contoh menjadi "contoh-<peran>-<rahasia>" agar tidak bisa ditebak
    # dari repositori. Kosong (lokal): token tetap "contoh-<peran>".
    seed_token_rahasia: str = _env("RAMBU_SEED_TOKEN_RAHASIA", "")

    @property
    def produksi(self) -> bool:
        return self.lingkungan == "production"

    @property
    def email_tersedia(self) -> bool:
        return bool(self.smtp_host)

    @property
    def ai_enabled(self) -> bool:
        if self.ai_provider == "gemini":
            return self.ai_enabled_flag and bool(self.gemini_api_key)
        has_credential = self.anthropic_api_key or os.getenv("ANTHROPIC_AUTH_TOKEN") or os.getenv("ANTHROPIC_PROFILE")
        return self.ai_enabled_flag and bool(has_credential)


settings = Settings()
