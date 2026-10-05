"""Lapisan AI tahap 2. Semua endpoint hanya dipanggil atas klik atau pesan pengguna,
tidak pernah otomatis, dan galat dikembalikan tanpa percobaan ulang otomatis (FR-26)."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

import secrets

from .. import dokumen, uji_paham, wawancara
from ..config import settings
from ..db import LogPemeriksa, SessionLocal
from ..engine import Masukan, hitung
from ..explain import penjelasan_ai, penjelasan_templat
from ..ratelimit import batasi_ai
from ..schemas import JawabanIn, MasukanIn, TeksIn, WawancaraIn

router = APIRouter(prefix="/api/ai")

TIDAK_AKTIF = "Fitur AI belum aktif di server ini. Semua hitungan tetap bisa dipakai tanpa AI."


def catat_pemeriksa(jenis: str, lolos: bool, alasan: list[str] | str = "") -> None:
    """ADM-04: jenis, hasil, alasan, kode acak. Isi dokumen dan obrolan tidak pernah dicatat."""
    teks = "; ".join(alasan) if isinstance(alasan, list) else alasan
    # Alasan pemeriksa bisa mengutip angka atau kalimat model; cukup simpan jenis alasannya.
    jenis_alasan = teks.split(":")[0][:300] if teks else ""
    try:
        with SessionLocal() as db:
            db.add(LogPemeriksa(jenis=jenis, hasil="lolos" if lolos else "ditolak", alasan=jenis_alasan, kode=secrets.token_hex(4)))
            db.commit()
    except Exception:  # pragma: no cover - log tidak boleh menggagalkan permintaan
        pass


def _wajib_aktif(request: Request) -> None:
    if not settings.ai_enabled:
        raise HTTPException(status_code=503, detail=TIDAK_AKTIF)
    batasi_ai(request)


@router.post("/salin-gambar")
async def salin_gambar(request: Request, gambar: UploadFile = File(...)) -> dict:
    """FR-16: gambar hanya disalin menjadi teks yang bisa dikoreksi."""
    if not settings.ai_enabled:
        raise HTTPException(status_code=503, detail=TIDAK_AKTIF)
    if gambar.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=415, detail="Unggah gambar JPG atau PNG.")
    data = await gambar.read(settings.max_upload_bytes + 1)
    await gambar.close()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Ukuran gambar maksimal 5 MB.")
    batasi_ai(request)
    try:
        teks = await run_in_threadpool(dokumen.salin_gambar, data)
    except dokumen.GambarTidakValid as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except dokumen.LayananGagal as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        del data  # gambar tidak disimpan
    return {"teks": teks}


@router.post("/baca-dokumen")
async def baca_dokumen(request: Request, body: TeksIn) -> dict:
    """FR-17: angka dan klausul berkutipan, diverifikasi kode."""
    _wajib_aktif(request)
    try:
        hasil = await run_in_threadpool(dokumen.baca_dokumen, body.teks)
    except dokumen.LayananGagal as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    d = hasil.as_dict()
    dibuang = d.get("klausul_dibuang", 0) + len(d.get("angka_ditolak", []))
    catat_pemeriksa("baca_dokumen", dibuang == 0, f"kutipan tidak ada di teks ({dibuang} temuan dibuang)" if dibuang else "")
    return {**d, "wajib_konfirmasi": True}


@router.post("/jelaskan")
def jelaskan(request: Request, m: MasukanIn) -> dict:
    """FR-20: angka dihitung ulang di server dari masukan; angka dari klien tidak dipercaya."""
    masukan = Masukan(**m.model_dump())
    h = hitung(masukan)
    if h is None:
        raise HTTPException(status_code=422, detail="Nilai pinjaman dan tenor harus lebih dari nol.")
    templat = penjelasan_templat(masukan, h)
    if not settings.ai_enabled:
        return {"teks": templat, "sumber": "templat", "penolakan": "nonaktif", "alasan": ["AI belum aktif"]}
    batasi_ai(request)
    teks, alasan, penolakan = penjelasan_ai(masukan, h)
    if penolakan == "pemeriksa" or teks:
        catat_pemeriksa("penjelasan", bool(teks), alasan)
    if not teks:
        return {"teks": templat, "sumber": "templat", "penolakan": penolakan, "alasan": alasan}
    return {"teks": teks, "sumber": "ai", "penolakan": None, "alasan": []}


@router.post("/wawancara")
async def wawancara_api(request: Request, body: WawancaraIn) -> dict:
    """FR-23: satu giliran percakapan dengan putaran alat catat_kewajiban dan hitung."""
    _wajib_aktif(request)
    if body.pesan[-1].peran != "pengguna":
        raise HTTPException(status_code=422, detail="Pesan terakhir harus dari pengguna.")
    daftar = [wawancara.Kewajiban(**k.model_dump()) for k in body.kewajiban]
    try:
        hasil = await run_in_threadpool(
            wawancara.giliran,
            [p.model_dump() for p in body.pesan],
            daftar,
            body.penghasilan,
            body.cicilan_penawaran,
        )
    except wawancara.LayananGagal as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not hasil.bantuan_prioritas:
        catat_pemeriksa("obrolan", hasil.sumber == "ai", hasil.alasan)
    return hasil.as_dict()


@router.post("/baca-jawaban")
async def baca_jawaban(request: Request, body: JawabanIn) -> dict:
    """FR-24 tahap 2: angka dari tulisan bebas, dengan kutipan terverifikasi."""
    _wajib_aktif(request)
    try:
        hasil = await run_in_threadpool(uji_paham.baca_jawaban, body.teks)
    except dokumen.LayananGagal as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    ditolak = hasil.get("ditolak", []) if isinstance(hasil, dict) else []
    catat_pemeriksa("uji_paham", not ditolak, f"angka tidak ada di tulisan pengguna ({len(ditolak)})" if ditolak else "")
    return hasil
