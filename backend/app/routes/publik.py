from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..config import settings
from ..db import Peristiwa, get_session, jam_ini
from ..engine import Masukan, hitung, kontrafaktual
from ..explain import angka_resmi, penjelasan_templat
from ..push import push_tersedia
from ..regulasi import kanal_pengaduan, semua_versi_mentah, versi_aktif
from ..schemas import MasukanIn, PeristiwaIn

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/config")
def config() -> dict:
    return {
        "ai_tersedia": settings.ai_enabled,
        "akun_tersedia": settings.akun_enabled,
        "push_tersedia": push_tersedia(),
        "regulasi_aktif": versi_aktif().mentah,
        "kanal_pengaduan": kanal_pengaduan(),
    }


@router.get("/regulasi")
def regulasi() -> dict:
    """XAI-08: versi, sumber, dan status tiap parameter. Klien memakai versi terbit terbaru."""
    return {"aktif": versi_aktif().id, "versi": [v for v in semua_versi_mentah() if v.get("status") == "terbit"]}


@router.post("/hitung")
def hitung_api(m: MasukanIn) -> dict:
    """Hitungan yang sama dengan mesin di perangkat. Untuk integrasi dan verifikasi, bukan untuk layar."""
    masukan = Masukan(**m.model_dump())
    h = hitung(masukan)
    if h is None:
        raise HTTPException(status_code=422, detail="Nilai pinjaman dan tenor harus lebih dari nol.")
    return {
        "hasil": h.as_dict(),
        "kontrafaktual": kontrafaktual(masukan, h),
        "tampilan": angka_resmi(masukan, h),
        "penjelasan_templat": penjelasan_templat(masukan, h),
        "label": "Perkiraan",
    }


@router.post("/events", status_code=204)
def catat_peristiwa(p: PeristiwaIn, db: Session = Depends(get_session)) -> Response:
    db.add(Peristiwa(nama=p.nama, props=p.props or None, sid=p.sid, waktu=jam_ini()))
    db.commit()
    return Response(status_code=204)
