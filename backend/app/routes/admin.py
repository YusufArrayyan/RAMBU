"""Panel Admin RAMBU dan laporan Mitra (PRD v4 Bagian 9, ADM-01 s.d. ADM-06, MIT-01 s.d. MIT-03).

Matriks akses (PRD 3.2) ditegakkan di server. Tidak ada peran, termasuk Superadmin, yang
bisa membaca data personal pengguna lewat antarmuka: tidak ada endpoint seperti itu.
"""

from __future__ import annotations

import hmac
import json
from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from ..config import settings

from ..db import AdminRAMBU, DataAkun, KontenKlausul, LogAudit, LogPemeriksa, Peristiwa, VersiParameter, get_session, kini
from ..keamanan import dekripsi, hash_hmac, token_acak
from .. import regulasi as reg_mod

router = APIRouter(prefix="/api/admin")
router_mitra = APIRouter(prefix="/api/mitra")

PERAN = ("penyunting", "peninjau", "analis", "superadmin", "mitra")
IZIN: dict[str, set[str]] = {
    "ajukan_parameter": {"penyunting", "peninjau", "superadmin"},
    "setujui_parameter": {"peninjau", "superadmin"},
    "sunting_klausul": {"penyunting", "peninjau", "superadmin"},
    "terbitkan_klausul": {"peninjau", "superadmin"},
    "lihat_log_pemeriksa": {"penyunting", "peninjau", "analis", "superadmin"},
    "lihat_dasbor": {"peninjau", "analis", "superadmin", "penyunting"},
    "lihat_laporan_mitra": {"analis", "superadmin", "mitra"},
    "kelola_admin": {"superadmin"},
}
K_ANONIM = 20  # MIT-01


class Pelaku(BaseModel):
    id: int | None
    nama: str
    peran: str


def pelaku(authorization: str = Header(default=""), db: Session = Depends(get_session)) -> Pelaku:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Masuk dengan token admin.")
    if settings.admin_token and hmac.compare_digest(token.encode(), settings.admin_token.encode()):
        return Pelaku(id=None, nama="Superadmin (token server)", peran="superadmin")
    a = db.scalar(select(AdminRAMBU).where(AdminRAMBU.token_hash == hash_hmac(token, "admin"), AdminRAMBU.aktif.is_(True)))
    if not a:
        raise HTTPException(status_code=401, detail="Token admin salah atau sudah dinonaktifkan.")
    return Pelaku(id=a.id, nama=a.nama, peran=a.peran)


def wajib(izin: str):
    def cek(p: Pelaku = Depends(pelaku)) -> Pelaku:
        if p.peran not in IZIN[izin]:
            raise HTTPException(status_code=403, detail="Peranmu tidak memiliki akses untuk tindakan ini.")
        return p

    return cek


def audit(db: Session, p: Pelaku, aksi: str, objek: str, detail: str = "") -> None:
    db.add(LogAudit(aktor=p.nama, peran=p.peran, aksi=aksi, objek=objek, detail=detail[:300]))


def _nama(db: Session, admin_id: int | None) -> str | None:
    if admin_id is None:
        return None
    a = db.get(AdminRAMBU, admin_id)
    return f"{a.nama} ({a.peran})" if a else None


@router.get("/saya")
def saya(p: Pelaku = Depends(pelaku)) -> dict:
    return {"nama": p.nama, "peran": p.peran, "izin": sorted(k for k, v in IZIN.items() if p.peran in v), "data_contoh": settings.seed_contoh}


# --- A01 Dasbor ----------------------------------------------------------------


@router.get("/dasbor")
def dasbor(_: Pelaku = Depends(wajib("lihat_dasbor")), db: Session = Depends(get_session)) -> dict:
    aktif = reg_mod.versi_aktif()
    menunggu = db.scalars(select(VersiParameter).where(VersiParameter.status == "menunggu").order_by(VersiParameter.id.desc())).all()
    sejak = kini() - timedelta(days=7)
    log = db.scalars(select(LogPemeriksa).where(LogPemeriksa.waktu >= sejak)).all()
    ditolak = [x for x in log if x.hasil == "ditolak"]
    hari_ini = kini().date()
    per_hari = []
    for i in range(6, -1, -1):
        d = hari_ini - timedelta(days=i)
        per_hari.append({"tanggal": d.isoformat(), "ditolak": sum(1 for x in ditolak if x.waktu.date() == d)})
    sesi_cek = db.scalar(select(func.count(distinct(Peristiwa.sid))).where(Peristiwa.nama == "offer_calculated")) or 0
    sesi_uji = db.scalar(select(func.count(distinct(Peristiwa.sid))).where(Peristiwa.nama == "uji_paham_completed")) or 0
    penyebab = Counter(x.alasan for x in ditolak if x.alasan).most_common(1)
    aktivitas = db.scalars(select(LogAudit).order_by(LogAudit.id.desc()).limit(6)).all()
    return {
        "versi_aktif": {"id": aktif.id, "diterbitkan": aktif.mentah.get("diterbitkan")},
        "menunggu": {"jumlah": len(menunggu), "terbaru": menunggu[0].catatan if menunggu else None},
        "ai_ditolak": {"ditolak": len(ditolak), "total": len(log)},
        "uji_paham": {"selesai": sesi_uji, "cek": sesi_cek, "proporsi": round(sesi_uji / sesi_cek, 3) if sesi_cek else None},
        "penolakan_per_hari": per_hari,
        "penyebab_terbanyak": penyebab[0][0] if penyebab else None,
        "aktivitas": [{"waktu": a.waktu.isoformat(), "aktor": a.aktor, "peran": a.peran, "aksi": a.aksi, "objek": a.objek, "detail": a.detail} for a in aktivitas],
        "data_contoh": settings.seed_contoh,
    }


# --- A02 Parameter berversi ------------------------------------------------------


class BarisBatasIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9_]{3,40}$")
    segmen: str
    pokok_maks: float | None = Field(default=None, gt=0)
    tenor_maks_hari: int | None = Field(default=None, ge=1, le=3650)
    persen: float | None = Field(default=None, ge=0, le=5)
    persen_min: float | None = Field(default=None, ge=0, le=5)
    persen_maks: float | None = Field(default=None, ge=0, le=5)
    sumber: str = Field(default="", max_length=200)
    status: str = "terverifikasi"


class DrafParameterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    versi: str = Field(pattern=r"^\d{4}\.\d{1,2}\.\d{1,3}$")
    berlaku_mulai: date
    batas_harian: list[BarisBatasIn] = Field(min_length=1, max_length=20)
    patokan_persen: float = Field(ge=1, le=100)
    patokan_sumber: str = Field(default="", max_length=200)
    catatan: str = Field(min_length=5, max_length=300)
    ajukan: bool = True


def _versi_json(db: Session, v: VersiParameter) -> dict:
    return {
        "id": v.id,
        "versi": v.versi,
        "status": v.status,
        "catatan": v.catatan,
        "isi": v.isi,
        "pengaju": _nama(db, v.pengaju_id),
        "pengaju_id": v.pengaju_id,
        "penyetuju": _nama(db, v.penyetuju_id),
        "dibuat": v.dibuat.isoformat(),
        "diputus": v.diputus.isoformat() if v.diputus else None,
    }


@router.get("/parameter")
def daftar_parameter(p: Pelaku = Depends(pelaku), db: Session = Depends(get_session)) -> dict:
    if p.peran == "mitra":
        raise HTTPException(status_code=403, detail="Peranmu tidak memiliki akses untuk tindakan ini.")
    versi = db.scalars(select(VersiParameter).order_by(VersiParameter.id.desc())).all()
    return {"aktif": reg_mod.versi_aktif().mentah, "versi": [_versi_json(db, v) for v in versi], "saya_id": p.id}


@router.post("/parameter")
def ajukan_parameter(body: DrafParameterIn, p: Pelaku = Depends(wajib("ajukan_parameter")), db: Session = Depends(get_session)) -> dict:
    if db.scalar(select(VersiParameter).where(VersiParameter.versi == body.versi)) or body.versi in {v["id"] for v in reg_mod.semua_versi_mentah()}:
        raise HTTPException(status_code=409, detail="Nomor versi sudah dipakai.")
    dasar = reg_mod.versi_aktif().mentah
    baris = []
    for b in body.batas_harian:
        d = b.model_dump()
        if not d["sumber"].strip():
            d["status"] = "nonaktif"  # A02: parameter tanpa sumber otomatis nonaktif
        if d["persen"] is None and (d["persen_min"] is None or d["persen_maks"] is None):
            raise HTTPException(status_code=422, detail=f"Baris {b.id}: isi persen atau rentang persen.")
        baris.append({k: v for k, v in d.items() if v is not None or k == "tenor_maks_hari"})
    isi = {
        **dasar,
        "id": body.versi,
        "berlaku_mulai": body.berlaku_mulai.isoformat(),
        "status": "menunggu" if body.ajukan else "draf",
        "batas_harian": baris,
        "patokan_rasio": {
            **dasar["patokan_rasio"],
            "persen": body.patokan_persen,
            "sumber": body.patokan_sumber or dasar["patokan_rasio"]["sumber"],
            "status": dasar["patokan_rasio"]["status"] if body.patokan_sumber or body.patokan_persen == dasar["patokan_rasio"]["persen"] else "nonaktif",
        },
    }
    v = VersiParameter(versi=body.versi, isi=isi, status=isi["status"], catatan=body.catatan, pengaju_id=p.id)
    db.add(v)
    audit(db, p, "ajukan_parameter" if body.ajukan else "simpan_draf_parameter", f"parameter {body.versi}", body.catatan)
    db.commit()
    return _versi_json(db, v)


def _ambil_versi(db: Session, vid: int) -> VersiParameter:
    v = db.get(VersiParameter, vid)
    if not v:
        raise HTTPException(status_code=404, detail="Versi tidak ditemukan.")
    return v


def muat_versi_terbit(db: Session) -> None:
    """Pasang versi yang diterbitkan lewat panel admin ke mesin hitung server."""
    reg_mod.set_versi_db([v.isi for v in db.scalars(select(VersiParameter).where(VersiParameter.status == "terbit"))])


@router.post("/parameter/{vid}/setujui")
def setujui_parameter(vid: int, p: Pelaku = Depends(wajib("setujui_parameter")), db: Session = Depends(get_session)) -> dict:
    v = _ambil_versi(db, vid)
    if v.status != "menunggu":
        raise HTTPException(status_code=409, detail="Hanya versi yang menunggu peninjau yang bisa disetujui.")
    if p.id is not None and p.id == v.pengaju_id:
        raise HTTPException(status_code=403, detail="Aturan dua orang: pengaju tidak dapat menyetujui perubahannya sendiri.")
    if p.id is None:
        raise HTTPException(status_code=403, detail="Persetujuan harus memakai akun peninjau bernama, bukan token server.")
    v.status, v.penyetuju_id, v.diputus = "terbit", p.id, kini()
    v.isi = {**v.isi, "status": "terbit", "diterbitkan": kini().date().isoformat(), "pengaju": _nama(db, v.pengaju_id) or "", "penyetuju": _nama(db, p.id) or ""}
    audit(db, p, "terbitkan_parameter", f"parameter {v.versi}", "disetujui orang kedua")
    db.commit()
    muat_versi_terbit(db)
    return _versi_json(db, v)


@router.post("/parameter/{vid}/tolak")
def tolak_parameter(vid: int, p: Pelaku = Depends(wajib("setujui_parameter")), db: Session = Depends(get_session)) -> dict:
    v = _ambil_versi(db, vid)
    if v.status not in ("menunggu", "draf"):
        raise HTTPException(status_code=409, detail="Versi ini tidak bisa ditolak.")
    v.status, v.penyetuju_id, v.diputus = "ditolak", p.id, kini()
    v.isi = {**v.isi, "status": "ditolak"}
    audit(db, p, "tolak_parameter", f"parameter {v.versi}")
    db.commit()
    return _versi_json(db, v)


# --- A03 Konten klausul ---------------------------------------------------------


class KlausulIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    judul: str = Field(min_length=3, max_length=80)
    penjelasan: str = Field(min_length=10, max_length=1200)
    rujukan: str = Field(max_length=200)
    contoh_kutipan: str = Field(max_length=400)


class StatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(pattern=r"^(draf|ditinjau|terbit)$")


def _klausul_json(k: KontenKlausul) -> dict:
    return {
        "id": k.id,
        "kategori": k.kategori,
        "judul": k.judul,
        "penjelasan": k.penjelasan,
        "rujukan": k.rujukan,
        "contoh_kutipan": k.contoh_kutipan,
        "status": k.status,
        "diubah": k.diubah.isoformat(),
        "diubah_oleh": k.diubah_oleh,
    }


@router.get("/klausul")
def daftar_klausul(_: Pelaku = Depends(wajib("lihat_log_pemeriksa")), db: Session = Depends(get_session)) -> list[dict]:
    return [_klausul_json(k) for k in db.scalars(select(KontenKlausul).order_by(KontenKlausul.id))]


@router.put("/klausul/{kid}")
def sunting_klausul(kid: int, body: KlausulIn, p: Pelaku = Depends(wajib("sunting_klausul")), db: Session = Depends(get_session)) -> dict:
    k = db.get(KontenKlausul, kid)
    if not k:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan.")
    for f, v in body.model_dump().items():
        setattr(k, f, v.strip())
    k.status, k.diubah, k.diubah_oleh = "draf", kini(), p.nama
    audit(db, p, "sunting_klausul", f"klausul {k.kategori}")
    db.commit()
    return _klausul_json(k)


@router.post("/klausul/{kid}/status")
def status_klausul(kid: int, body: StatusIn, p: Pelaku = Depends(wajib("sunting_klausul")), db: Session = Depends(get_session)) -> dict:
    k = db.get(KontenKlausul, kid)
    if not k:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan.")
    if body.status == "terbit":
        if p.peran not in IZIN["terbitkan_klausul"]:
            raise HTTPException(status_code=403, detail="Hanya peninjau yang bisa menerbitkan konten klausul.")
        if k.status != "ditinjau":
            raise HTTPException(status_code=409, detail="Ajukan untuk ditinjau dulu sebelum terbit.")
        if k.diubah_oleh == p.nama:
            raise HTTPException(status_code=403, detail="Aturan dua orang: penyunting terakhir tidak dapat menerbitkan sendiri.")
    k.status = body.status
    audit(db, p, f"klausul_{body.status}", f"klausul {k.kategori}")
    db.commit()
    return _klausul_json(k)


# --- A04 Log pemeriksa ----------------------------------------------------------


@router.get("/log-pemeriksa")
def log_pemeriksa(
    jenis: str = Query(default="", max_length=20),
    hasil: str = Query(default="", max_length=10),
    hari: int = Query(default=7, ge=1, le=90),
    _: Pelaku = Depends(wajib("lihat_log_pemeriksa")),
    db: Session = Depends(get_session),
) -> dict:
    q = select(LogPemeriksa).where(LogPemeriksa.waktu >= kini() - timedelta(days=hari))
    if jenis:
        q = q.where(LogPemeriksa.jenis == jenis)
    if hasil:
        q = q.where(LogPemeriksa.hasil == hasil)
    baris = db.scalars(q.order_by(LogPemeriksa.id.desc()).limit(300)).all()
    semua = db.scalars(select(LogPemeriksa).where(LogPemeriksa.waktu >= kini() - timedelta(days=hari))).all()
    return {
        "baris": [{"waktu": x.waktu.isoformat(), "jenis": x.jenis, "hasil": x.hasil, "alasan": x.alasan, "kode": x.kode} for x in baris],
        "ringkas": {
            "total": len(semua),
            "ditolak": sum(1 for x in semua if x.hasil == "ditolak"),
            "per_alasan": [{"alasan": a, "jumlah": n} for a, n in Counter(x.alasan for x in semua if x.hasil == "ditolak" and x.alasan).most_common(5)],
            "per_jenis": [{"jenis": j, "jumlah": n} for j, n in Counter(x.jenis for x in semua).most_common()],
        },
        "catatan": "Isi dokumen dan obrolan tidak disimpan. Kode acak hanya untuk merujuk baris.",
    }


# --- Pengguna admin dan audit ------------------------------------------------------


class AdminIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nama: str = Field(min_length=2, max_length=60)
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", max_length=120)
    peran: str


@router.get("/pengguna")
def daftar_admin(_: Pelaku = Depends(wajib("kelola_admin")), db: Session = Depends(get_session)) -> list[dict]:
    return [{"id": a.id, "nama": a.nama, "email": a.email, "peran": a.peran, "aktif": a.aktif, "dibuat": a.dibuat.isoformat()} for a in db.scalars(select(AdminRAMBU).order_by(AdminRAMBU.id))]


@router.post("/pengguna")
def tambah_admin(body: AdminIn, p: Pelaku = Depends(wajib("kelola_admin")), db: Session = Depends(get_session)) -> dict:
    if body.peran not in PERAN:
        raise HTTPException(status_code=422, detail="Peran tidak dikenal.")
    if db.scalar(select(AdminRAMBU).where(AdminRAMBU.email == body.email.lower())):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar.")
    token = token_acak(24)
    a = AdminRAMBU(nama=body.nama, email=body.email.lower(), peran=body.peran, token_hash=hash_hmac(token, "admin"))
    db.add(a)
    audit(db, p, "tambah_admin", f"admin {body.email.lower()}", body.peran)
    db.commit()
    return {"id": a.id, "token": token, "catatan": "Token hanya ditampilkan sekali. Serahkan lewat kanal aman."}


@router.post("/pengguna/{aid}/aktif")
def ubah_aktif(aid: int, aktif: bool = Query(...), p: Pelaku = Depends(wajib("kelola_admin")), db: Session = Depends(get_session)) -> dict:
    a = db.get(AdminRAMBU, aid)
    if not a:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan.")
    if p.id == a.id and not aktif:
        raise HTTPException(status_code=409, detail="Kamu tidak bisa menonaktifkan akunmu sendiri.")
    a.aktif = aktif
    audit(db, p, "aktifkan_admin" if aktif else "nonaktifkan_admin", f"admin {a.email}")
    db.commit()
    return {"ok": True}


@router.get("/audit")
def log_audit(_: Pelaku = Depends(wajib("lihat_log_pemeriksa")), db: Session = Depends(get_session)) -> list[dict]:
    return [{"waktu": a.waktu.isoformat(), "aktor": a.aktor, "peran": a.peran, "aksi": a.aksi, "objek": a.objek, "detail": a.detail} for a in db.scalars(select(LogAudit).order_by(LogAudit.id.desc()).limit(200))]


# --- M01 Laporan agregat mitra (k >= 20) --------------------------------------------


def _sembunyikan(n: int) -> int | None:
    return n if n >= K_ANONIM else None


@router_mitra.get("/laporan")
def laporan_mitra(hari: int = Query(default=30, ge=7, le=365), _: Pelaku = Depends(wajib("lihat_laporan_mitra")), db: Session = Depends(get_session)) -> dict:
    sejak = kini() - timedelta(days=hari)

    def sesi(nama: str, **props) -> set[str]:
        rows = db.execute(select(Peristiwa.sid, Peristiwa.props).where(Peristiwa.nama == nama, Peristiwa.waktu >= sejak)).all()
        return {sid for sid, pr in rows if all((pr or {}).get(k) == v for k, v in props.items())}

    aktif = db.scalar(select(func.count(distinct(Peristiwa.sid))).where(Peristiwa.waktu >= sejak)) or 0
    cek = sesi("offer_calculated")
    uji = sesi("uji_paham_completed")
    keputusan = {p: len(sesi("decision_made", pilihan=p)) for p in ("ambil", "tidak_jadi", "ubah")}
    per_segmen = {s: len(sesi("offer_calculated", segmen=s)) for s in reg_mod.SEGMEN}
    tepat = Counter((pr or {}).get("tepat") for _, pr in db.execute(select(Peristiwa.sid, Peristiwa.props).where(Peristiwa.nama == "uji_paham_completed", Peristiwa.waktu >= sejak)).all())
    total_keputusan = sum(keputusan.values())
    return {
        "rentang_hari": hari,
        "k_minimum": K_ANONIM,
        "pengguna_aktif": _sembunyikan(aktif),
        "sesi_cek": _sembunyikan(len(cek)),
        "uji_paham_selesai_persen": round(len(uji & cek) / len(cek) * 100, 1) if len(cek) >= K_ANONIM else None,
        "sebaran_uji_paham": {k: _sembunyikan(tepat.get(k, 0)) for k in ("0", "1", "2", "3")},
        "keputusan": {k: _sembunyikan(v) for k, v in keputusan.items()} if total_keputusan >= K_ANONIM else None,
        "per_segmen": {k: _sembunyikan(v) for k, v in per_segmen.items()},
        **_rasio_agregat(db),
        "contoh": CONTOH_MITRA if settings.seed_contoh and not settings.produksi else None,
        "catatan": "Hanya agregat anonim. Kelompok dengan kurang dari 20 pengguna tidak ditampilkan. Tidak ada ekspor per orang.",
    }


RENTANG = [("<10%", 0, 10), ("10–20%", 10, 20), ("20–30%", 20, 30), ("30–40%", 30, 40), (">40%", 40, 10_000)]
# Angka mockup PRD M01, hanya untuk demo pengembangan dan selalu berlabel DATA CONTOH.
CONTOH_MITRA = {
    "pengguna_aktif": 2140,
    "uji_paham_selesai_persen": 63,
    "di_atas_patokan_persen": 39,
    "sebaran_rasio": [{"rentang": r, "persen": p} for (r, _, _), p in zip(RENTANG, [8, 22, 31, 24, 15])],
    "periode": "Jul–Sep 2026",
}


def _rasio_agregat(db: Session) -> dict:
    """Rasio cicilan bulan ini terhadap penghasilan dari akun yang punya pinjaman aktif.

    Dihitung di memori dari cadangan terenkripsi; hanya persentase per rentang yang keluar, dan
    hanya bila jumlah pengguna minimal k = 20. Tidak ada nilai per orang yang dikembalikan.
    """
    bulan = kini().date().isoformat()[:7]
    rasio: list[float] = []
    for d in db.scalars(select(DataAkun)):
        try:
            isi = json.loads(dekripsi(d.isi_enkripsi))
        except Exception:
            continue
        pendapatan = (isi.get("profil") or {}).get("penghasilan")
        if not pendapatan:
            continue
        total = sum(float(c.get("jumlah", 0)) for p in isi.get("pinjaman", []) for c in p.get("cicilan", []) if str(c.get("jatuhTempo", "")).startswith(bulan))
        if total > 0:
            rasio.append(total / float(pendapatan) * 100)
    n = len(rasio)
    if n < K_ANONIM:
        return {"pengguna_dengan_pinjaman": None, "di_atas_patokan_persen": None, "sebaran_rasio": None}
    L = reg_mod.versi_aktif().patokan_rasio_persen
    sebaran = []
    for label, lo, hi in RENTANG:
        jumlah = sum(1 for r in rasio if lo <= r < hi)
        sebaran.append({"rentang": label, "persen": round(jumlah / n * 100, 1) if jumlah >= K_ANONIM else None})
    return {"pengguna_dengan_pinjaman": n, "di_atas_patokan_persen": round(sum(1 for r in rasio if r > L) / n * 100, 1), "sebaran_rasio": sebaran}


__all__ = ["router", "router_mitra", "muat_versi_terbit", "IZIN", "PERAN"]
