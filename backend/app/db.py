"""Basis data RAMBU v4 (PRD 14.2, 20.5).

- Peristiwa: analitik anonim (16.2). Tanpa nilai uang, identitas, atau alamat IP.
- Akun, TautanMasuk, Sesi, DataAkun: hanya mode akun. Data jadwal dan pengaturan
  disimpan terenkripsi (NFR-06). Tidak ada kata sandi.
- PengingatTerkirim: mencegah pengingat terkirim dua kali.
- AdminRAMBU, VersiParameter, KontenKlausul, LogPemeriksa, LogAudit: sisi admin (Bagian 9).
  Tidak ada tabel admin yang memuat data personal pengguna.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


def kini() -> datetime:
    return datetime.now(timezone.utc)


def jam_ini() -> datetime:
    """Dibulatkan ke jam agar analitik tidak bisa dipakai melacak perilaku per detik."""
    return kini().replace(minute=0, second=0, microsecond=0)


class Peristiwa(Base):
    __tablename__ = "peristiwa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nama: Mapped[str] = mapped_column(String(40), index=True)
    layar: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    props: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sid: Mapped[str] = mapped_column(String(32), index=True)
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


# --- Akun Peminjam (opsional) --------------------------------------------------


class Akun(Base):
    __tablename__ = "akun"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Email disimpan terenkripsi; pencarian memakai hash HMAC.
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email_enkripsi: Mapped[bytes] = mapped_column(LargeBinary)
    setuju_usia_18: Mapped[bool] = mapped_column(Boolean, default=False)
    dibuat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


class TautanMasuk(Base):
    __tablename__ = "tautan_masuk"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email_hash: Mapped[str] = mapped_column(String(64), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    kode_hash: Mapped[str] = mapped_column(String(64))
    percobaan: Mapped[int] = mapped_column(Integer, default=0)
    kedaluwarsa: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    dipakai: Mapped[bool] = mapped_column(Boolean, default=False)


class Sesi(Base):
    __tablename__ = "sesi"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    akun_id: Mapped[int] = mapped_column(ForeignKey("akun.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    dibuat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


class DataAkun(Base):
    __tablename__ = "data_akun"

    akun_id: Mapped[int] = mapped_column(ForeignKey("akun.id", ondelete="CASCADE"), primary_key=True)
    isi_enkripsi: Mapped[bytes] = mapped_column(LargeBinary)
    diubah: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


class LanggananPush(Base):
    """Langganan Web Push per perangkat. Dihapus saat keluar, cabut izin, atau hapus akun."""

    __tablename__ = "langganan_push"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    akun_id: Mapped[int] = mapped_column(ForeignKey("akun.id", ondelete="CASCADE"), index=True)
    endpoint_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    isi_enkripsi: Mapped[bytes] = mapped_column(LargeBinary)
    sesi_hash: Mapped[str] = mapped_column(String(64), index=True, default="")
    dibuat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


class PengingatTerkirim(Base):
    __tablename__ = "pengingat_terkirim"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    akun_id: Mapped[int] = mapped_column(ForeignKey("akun.id", ondelete="CASCADE"), index=True)
    notif_id: Mapped[str] = mapped_column(String(80), index=True)
    kanal: Mapped[str] = mapped_column(String(10))
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


# --- Admin RAMBU dan mitra (desktop) --------------------------------------------


class AdminRAMBU(Base):
    __tablename__ = "admin_rambu"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nama: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(120), unique=True)
    peran: Mapped[str] = mapped_column(String(20))  # penyunting | peninjau | analis | superadmin | mitra
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)


class VersiParameter(Base):
    __tablename__ = "versi_parameter"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    versi: Mapped[str] = mapped_column(String(20), unique=True)
    isi: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(12), index=True)  # draf | menunggu | terbit | ditolak | arsip
    catatan: Mapped[str] = mapped_column(Text, default="")
    pengaju_id: Mapped[int | None] = mapped_column(ForeignKey("admin_rambu.id"), nullable=True)
    penyetuju_id: Mapped[int | None] = mapped_column(ForeignKey("admin_rambu.id"), nullable=True)
    dibuat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)
    diputus: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KontenKlausul(Base):
    __tablename__ = "konten_klausul"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kategori: Mapped[str] = mapped_column(String(40), unique=True)
    judul: Mapped[str] = mapped_column(String(80))
    penjelasan: Mapped[str] = mapped_column(Text)
    rujukan: Mapped[str] = mapped_column(String(200))
    contoh_kutipan: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12))  # draf | ditinjau | terbit
    diubah: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini)
    diubah_oleh: Mapped[str] = mapped_column(String(60), default="")


class LogPemeriksa(Base):
    """ADM-04: jenis, hasil, alasan, kode acak. Tanpa isi dokumen atau obrolan."""

    __tablename__ = "log_pemeriksa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini, index=True)
    jenis: Mapped[str] = mapped_column(String(20), index=True)  # baca_dokumen | obrolan | uji_paham | penjelasan
    hasil: Mapped[str] = mapped_column(String(10), index=True)  # lolos | ditolak
    alasan: Mapped[str] = mapped_column(String(300), default="")
    kode: Mapped[str] = mapped_column(String(12))


class LogAudit(Base):
    """ADM-06: setiap perubahan parameter dan konten."""

    __tablename__ = "log_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    waktu: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=kini, index=True)
    aktor: Mapped[str] = mapped_column(String(60))
    peran: Mapped[str] = mapped_column(String(20))
    aksi: Mapped[str] = mapped_column(String(40))
    objek: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str] = mapped_column(String(300), default="")


_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    # Kolom baru pada tabel lama (v3) ditambahkan tanpa alat migrasi untuk SQLite pengembangan.
    Base.metadata.create_all(engine)
    if settings.database_url.startswith("sqlite"):
        with engine.begin() as c:
            kolom = {r[1] for r in c.exec_driver_sql("PRAGMA table_info(peristiwa)")}
            if "props" not in kolom:
                c.exec_driver_sql("ALTER TABLE peristiwa ADD COLUMN props JSON")


def get_session():
    with SessionLocal() as s:
        yield s


__all__ = [
    "AdminRAMBU",
    "Akun",
    "Base",
    "DataAkun",
    "KontenKlausul",
    "LanggananPush",
    "LogAudit",
    "LogPemeriksa",
    "PengingatTerkirim",
    "Peristiwa",
    "Sesi",
    "Session",
    "SessionLocal",
    "TautanMasuk",
    "VersiParameter",
    "engine",
    "get_session",
    "init_db",
    "jam_ini",
    "kini",
]
