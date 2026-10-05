"""Akun opsional Peminjam (PRD v4 3.3, ACC-01, ACC-04 s.d. ACC-07).

Masuk lewat tautan sekali pakai yang berlaku 15 menit, dengan cadangan kode 6 digit.
Tidak ada kata sandi. Data jadwal dan pengaturan disimpan terenkripsi. Menghapus akun
menghapus seluruh data server pengguna (AC-14).
"""

from __future__ import annotations

import json
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import Akun, DataAkun, LanggananPush, PengingatTerkirim, Sesi, TautanMasuk, get_session, kini
from ..push import kunci_publik, push_tersedia
from ..email import kirim_email
from ..keamanan import dekripsi, enkripsi, hash_hmac, kode_6_digit, token_acak
from ..ratelimit import batasi

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/akun")

BERLAKU_MENIT = 15
MAKS_PERCOBAAN_KODE = 5
MAKS_UKURAN_DATA = 512 * 1024


def _wajib_aktif() -> None:
    if not settings.akun_enabled:
        raise HTTPException(status_code=503, detail="Akun belum tersedia di server ini. Mode tamu tetap bisa dipakai penuh.")


class TautanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=5, max_length=120, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
    setuju_usia: bool


class LanggananIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    endpoint: str = Field(min_length=10, max_length=1000, pattern=r"^https://")
    keys: dict[str, str]


class VerifikasiIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str | None = Field(default=None, max_length=120)
    kode: str | None = Field(default=None, pattern=r"^\d{6}$")
    tautan: str | None = Field(default=None, max_length=100)


def _email_hash(email: str) -> str:
    return hash_hmac(email.strip().lower(), "email")


def akun_dari_token(authorization: str = Header(default=""), db: Session = Depends(get_session)) -> Akun:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Masuk dulu untuk memakai fitur akun.")
    sesi = db.scalar(select(Sesi).where(Sesi.token_hash == hash_hmac(token, "sesi")))
    if not sesi:
        raise HTTPException(status_code=401, detail="Sesi sudah berakhir. Masuk lagi.")
    akun = db.get(Akun, sesi.akun_id)
    if not akun:
        raise HTTPException(status_code=401, detail="Akun tidak ditemukan.")
    return akun


@router.post("/tautan")
def kirim_tautan(body: TautanIn, request: Request, db: Session = Depends(get_session)) -> dict:
    _wajib_aktif()
    batasi(request, kunci=f"tautan:{_email_hash(body.email)}", maks=5, jendela_s=900)
    if not body.setuju_usia:
        raise HTTPException(status_code=422, detail="Akun hanya untuk pengguna berusia 18 tahun ke atas.")
    email = body.email.strip().lower()
    token, kode = token_acak(), kode_6_digit()
    db.add(
        TautanMasuk(
            email_hash=_email_hash(email),
            token_hash=hash_hmac(token, "tautan"),
            kode_hash=hash_hmac(f"{email}:{kode}", "kode"),
            kedaluwarsa=kini() + timedelta(minutes=BERLAKU_MENIT),
        )
    )
    db.commit()
    url = f"{settings.app_url.rstrip('/')}/masuk?tautan={token}"
    terkirim = kirim_email(
        email,
        "Tautan masuk RAMBU",
        f"Buka tautan ini untuk masuk ke RAMBU (berlaku {BERLAKU_MENIT} menit):\n{url}\n\n"
        f"Atau masukkan kode: {kode}\n\nKalau kamu tidak meminta ini, abaikan email ini.",
    )
    hasil: dict = {"dikirim": True, "berlaku_menit": BERLAKU_MENIT}
    if not terkirim and not settings.produksi:
        # Pengembangan tanpa layanan email: kode ditampilkan agar alur bisa diuji.
        hasil["kode_pengembangan"] = kode
    return hasil


@router.post("/verifikasi")
def verifikasi(body: VerifikasiIn, request: Request, db: Session = Depends(get_session)) -> dict:
    _wajib_aktif()
    batasi(request, kunci="verifikasi", maks=30, jendela_s=900)
    if body.tautan:
        t = db.scalar(select(TautanMasuk).where(TautanMasuk.token_hash == hash_hmac(body.tautan, "tautan")))
        if not t or t.dipakai:
            raise HTTPException(status_code=400, detail="Tautan tidak valid atau sudah dipakai. Kirim tautan baru.")
    elif body.email and body.kode:
        eh = _email_hash(body.email)
        t = db.scalar(select(TautanMasuk).where(TautanMasuk.email_hash == eh, TautanMasuk.dipakai.is_(False)).order_by(TautanMasuk.id.desc()))
        if not t:
            raise HTTPException(status_code=400, detail="Belum ada kode untuk email ini. Kirim tautan dulu.")
        if t.percobaan >= MAKS_PERCOBAAN_KODE:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Kirim tautan baru.")
        if t.kode_hash != hash_hmac(f"{body.email.strip().lower()}:{body.kode}", "kode"):
            t.percobaan += 1
            db.commit()
            raise HTTPException(status_code=400, detail="Kode tidak cocok. Periksa lagi email terbaru dari RAMBU.")
    else:
        raise HTTPException(status_code=422, detail="Isi kode 6 digit atau buka tautan dari email.")

    kedaluwarsa = t.kedaluwarsa if t.kedaluwarsa.tzinfo else t.kedaluwarsa.replace(tzinfo=kini().tzinfo)
    if kedaluwarsa < kini():
        raise HTTPException(status_code=410, detail="Tautan sudah kedaluwarsa. Kirim tautan baru.")
    t.dipakai = True

    akun = db.scalar(select(Akun).where(Akun.email_hash == t.email_hash))
    baru = akun is None
    if baru:
        if not body.email:
            raise HTTPException(status_code=400, detail="Untuk akun baru, masukkan kode dari email bersama alamat emailnya.")
        akun = Akun(email_hash=t.email_hash, email_enkripsi=enkripsi(body.email.strip().lower()), setuju_usia_18=True)
        db.add(akun)
        db.flush()
    token = token_acak()
    db.add(Sesi(akun_id=akun.id, token_hash=hash_hmac(token, "sesi")))
    db.commit()
    return {"token": token, "email": dekripsi(akun.email_enkripsi), "baru": baru}


@router.get("/data")
def ambil_data(akun: Akun = Depends(akun_dari_token), db: Session = Depends(get_session)) -> dict:
    d = db.get(DataAkun, akun.id)
    if not d:
        return {"profil": None, "pinjaman": [], "pengingat": None, "diubah": None}
    isi = json.loads(dekripsi(d.isi_enkripsi))
    return {**isi, "diubah": d.diubah.isoformat()}


@router.put("/data", status_code=204)
async def simpan_data(request: Request, akun: Akun = Depends(akun_dari_token), db: Session = Depends(get_session)) -> Response:
    mentah = await request.body()
    if len(mentah) > MAKS_UKURAN_DATA:
        raise HTTPException(status_code=413, detail="Data terlalu besar.")
    try:
        isi = json.loads(mentah)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Format data tidak dikenali.") from exc
    if not isinstance(isi, dict) or not isinstance(isi.get("pinjaman", []), list):
        raise HTTPException(status_code=422, detail="Format data tidak dikenali.")
    # Hanya yang dibutuhkan untuk pengingat dan cadangan (PRD 14.1).
    simpan = {"profil": isi.get("profil"), "pinjaman": isi.get("pinjaman", []), "pengingat": isi.get("pengingat")}
    data = db.get(DataAkun, akun.id)
    teks = enkripsi(json.dumps(simpan, ensure_ascii=False))
    if data:
        data.isi_enkripsi, data.diubah = teks, kini()
    else:
        db.add(DataAkun(akun_id=akun.id, isi_enkripsi=teks))
    db.commit()
    return Response(status_code=204)


@router.post("/keluar", status_code=204)
def keluar(authorization: str = Header(default=""), db: Session = Depends(get_session)) -> Response:
    """Keluar: sesi dan langganan push perangkat ini dicabut (PRD 14.1)."""
    token = authorization.removeprefix("Bearer ").strip()
    if token:
        sh = hash_hmac(token, "sesi")
        db.execute(delete(LanggananPush).where(LanggananPush.sesi_hash == sh))
        db.execute(delete(Sesi).where(Sesi.token_hash == sh))
        db.commit()
    return Response(status_code=204)


# --- Web Push (ING-05) ------------------------------------------------------------


@router.get("/push/kunci")
def kunci_push() -> dict:
    if not push_tersedia():
        raise HTTPException(status_code=503, detail="Notifikasi push belum dikonfigurasi di server ini. Email tetap bisa dipakai.")
    return {"kunci_publik": kunci_publik()}


@router.post("/push/langganan", status_code=204)
def langganan_push(body: LanggananIn, authorization: str = Header(default=""), akun: Akun = Depends(akun_dari_token), db: Session = Depends(get_session)) -> Response:
    if not push_tersedia():
        raise HTTPException(status_code=503, detail="Notifikasi push belum dikonfigurasi di server ini.")
    if not {"p256dh", "auth"} <= set(body.keys):
        raise HTTPException(status_code=422, detail="Langganan push tidak lengkap.")
    eh = hash_hmac(body.endpoint, "push")
    isi = enkripsi(json.dumps({"endpoint": body.endpoint, "keys": {"p256dh": body.keys["p256dh"], "auth": body.keys["auth"]}}))
    sh = hash_hmac(authorization.removeprefix("Bearer ").strip(), "sesi")
    ada = db.scalar(select(LanggananPush).where(LanggananPush.endpoint_hash == eh))
    if ada:
        ada.akun_id, ada.isi_enkripsi, ada.sesi_hash = akun.id, isi, sh
    else:
        db.add(LanggananPush(akun_id=akun.id, endpoint_hash=eh, isi_enkripsi=isi, sesi_hash=sh))
    db.commit()
    return Response(status_code=204)


@router.delete("/push/langganan", status_code=204)
def cabut_push(akun: Akun = Depends(akun_dari_token), db: Session = Depends(get_session)) -> Response:
    """Pengguna mematikan notifikasi: semua langganan push akun ini dihapus."""
    db.execute(delete(LanggananPush).where(LanggananPush.akun_id == akun.id))
    db.commit()
    return Response(status_code=204)


@router.delete("", status_code=204)
def hapus_akun(akun: Akun = Depends(akun_dari_token), db: Session = Depends(get_session)) -> Response:
    """AC-14: seluruh data server pengguna terhapus dan sesi (token) dicabut."""
    for model in (PengingatTerkirim, LanggananPush, DataAkun, Sesi):
        db.execute(delete(model).where(model.akun_id == akun.id))
    db.execute(delete(TautanMasuk).where(TautanMasuk.email_hash == akun.email_hash))
    db.delete(akun)
    db.commit()
    log.info("akun dihapus")
    return Response(status_code=204)
