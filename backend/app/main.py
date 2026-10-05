"""RAMBU API v4.

Cek berjalan di perangkat; server ini menyediakan:
- parameter regulasi berversi (/api/config, /api/regulasi) dan hitungan referensi (/api/hitung)
- analitik anonim sesuai kamus event 16.2 (/api/events)
- akun opsional: tautan masuk, cadangan terenkripsi, hapus akun (/api/akun)
- penjadwal pengingat mode akun (email)
- lapisan AI dengan pemeriksa keluaran (/api/ai), aktif bila kredensial tersedia
- panel admin dan laporan mitra (/api/admin, /api/mitra)
- berkas statis frontend hasil build (bila ada), dengan fallback SPA
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import SessionLocal, init_db
from .pengingat import loop_penjadwal
from .push import push_tersedia
from .routes import admin, ai, akun, publik
from .seed import seed

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed(db)
        admin.muat_versi_terbit(db)
    tugas = asyncio.create_task(loop_penjadwal()) if settings.akun_enabled and (settings.email_tersedia or push_tersedia()) else None
    yield
    if tugas:
        tugas.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await tugas


app = FastAPI(
    title="RAMBU API",
    description="Rujukan Analisis Mampu Bayar dan Utang. Semua angka adalah perkiraan, bukan nasihat keuangan.",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

CSP = (
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
    if not request.url.path.startswith(("/api", "/docs", "/openapi.json", "/redoc")):
        response.headers.setdefault("Content-Security-Policy", CSP)
    if request.url.path.startswith("/api"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


app.include_router(publik.router)
app.include_router(ai.router)
app.include_router(akun.router)
app.include_router(admin.router)
app.include_router(admin.router_mitra)


@app.exception_handler(404)
async def not_found(request: Request, exc):
    if request.url.path.startswith("/api"):
        detail = getattr(exc, "detail", None) or "Tidak ditemukan."
        return JSONResponse({"detail": detail}, status_code=404)
    index = Path(settings.static_dir) / "index.html"
    if index.is_file():
        return FileResponse(index)  # fallback SPA untuk rute seperti /hasil
    return JSONResponse({"detail": "Tidak ditemukan."}, status_code=404)


_static = Path(settings.static_dir)
if (_static / "index.html").is_file():
    app.mount("/", StaticFiles(directory=_static, html=True), name="frontend")
