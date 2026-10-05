"""Penjadwal pengingat mode akun (PRD 7.7, ING-01 s.d. ING-05).

Cermin dari frontend/src/lib/pengingat.ts: H-3, H-1, H, H+1, H+3; berhenti setelah cicilan
ditandai dibayar; jam tenang menunda; maksimal N per hari; cicilan di hari yang sama digabung;
mode privasi tanpa jumlah. Tanggal dan jam memakai zona waktu pengguna (NFR-09).
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from .config import settings
from .db import Akun, DataAkun, LanggananPush, PengingatTerkirim, SessionLocal
from .email import kirim_email
from .formatting import rupiah
from .keamanan import dekripsi
from .push import kirim_push

log = logging.getLogger(__name__)

LABEL = {-3: "H-3", -1: "H-1", 0: "Hari H", 1: "H+1", 3: "H+3"}
PRIORITAS = {"H+3": 0, "H+1": 1, "Hari H": 2, "H-1": 3, "H-3": 4, "Gajian": 5}
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


@dataclass
class Notif:
    id: str
    tanggal: date
    jam: str
    pemicu: str
    isi: str


def _menit(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def di_jam_tenang(mnt: int, mulai: str, selesai: str) -> bool:
    s, e = _menit(mulai), _menit(selesai)
    if s == e:
        return False
    return s <= mnt < e if s < e else mnt >= s or mnt < e


def geser(tanggal: date, jam: str, mulai: str, selesai: str) -> tuple[date, str]:
    m = _menit(jam)
    if not di_jam_tenang(m, mulai, selesai):
        return tanggal, jam
    e = _menit(selesai)
    return (tanggal + timedelta(days=1) if m >= e else tanggal), f"{e // 60:02d}:{e % 60:02d}"


def _tgl(iso: str) -> date:
    return date.fromisoformat(iso)


def teks(pemicu: str, jatuh: date, jumlah: int, total: float, privasi: bool) -> str:
    tgl = f"{jatuh.day} {BULAN[jatuh.month - 1]}"
    banyak = f"{jumlah} cicilan" if jumlah > 1 else "Cicilan"
    nominal = "" if privasi else f" ({rupiah(total)})"
    return {
        "H-3": f"Ada {banyak.lower()} jatuh tempo 3 hari lagi ({tgl}){nominal}. Buka untuk lihat.",
        "H-1": f"{banyak} jatuh tempo besok{nominal}.",
        "Hari H": f"{banyak} jatuh tempo hari ini{nominal}.",
        "H+1": f"{banyak} belum ditandai. Sudah dibayar? Tandai di RAMBU. Kalau terasa berat, ada pilihan bantuan.",
        "H+3": f"{banyak} {tgl} masih belum ditandai. Buka RAMBU untuk melihat pilihan.",
    }[pemicu]


def sisa_cicilan(pinjaman: dict, cicilan: dict) -> float:
    dibayar = sum(p.get("jumlah", 0) for p in pinjaman.get("pembayaran", []) if p.get("cicilanId") == cicilan["id"])
    return max(0.0, float(cicilan["jumlah"]) - dibayar)


def jadwalkan(data: dict, hari: date) -> list[Notif]:
    """Pengingat untuk satu hari kalender lokal pengguna."""
    a = data.get("pengingat") or {}
    offsets = a.get("offsets", [-3, -1, 0, 1, 3])
    jam, mulai, selesai = a.get("jamKirim", "09:00"), a.get("jamTenangMulai", "21:00"), a.get("jamTenangSelesai", "07:00")
    privasi = a.get("privasi", True)
    grup: dict[tuple, dict] = {}
    for p in data.get("pinjaman", []):
        for c in p.get("cicilan", []):
            sisa = sisa_cicilan(p, c)
            if sisa <= 0.5:
                continue  # ING-02: berhenti setelah ditandai dibayar
            jatuh = _tgl(c["jatuhTempo"])
            for off in offsets:
                kirim = jatuh + timedelta(days=off)
                t, j = geser(kirim, jam, mulai, selesai)
                if t != hari:
                    continue
                k = (LABEL[off], jatuh)
                g = grup.setdefault(k, {"ids": [], "total": 0.0, "jam": j, "kirim": kirim})
                g["ids"].append(c["id"])
                g["total"] += sisa
    # id sama dengan klien: "<tanggal pemicu>-<pemicu>-<jatuh tempo>"
    hasil = [
        Notif(id=f"{g['kirim'].isoformat()}-{pem}-{jatuh.isoformat()}", tanggal=hari, jam=g["jam"], pemicu=pem, isi=teks(pem, jatuh, len(g["ids"]), g["total"], privasi))
        for (pem, jatuh), g in grup.items()
    ]
    hasil.sort(key=lambda n: PRIORITAS[n.pemicu])
    return hasil[: max(0, int(a.get("maksPerHari", 5)))]


def jalankan_sekali(sekarang_utc: datetime | None = None) -> int:
    """Kirim pengingat yang jatuh waktunya untuk semua akun. Kembalikan jumlah yang terkirim."""
    sekarang_utc = sekarang_utc or datetime.now(ZoneInfo("UTC"))
    terkirim = 0
    with SessionLocal() as db:
        for d in db.scalars(select(DataAkun)):
            try:
                data = json.loads(dekripsi(d.isi_enkripsi))
            except Exception:  # data rusak: lewati, jangan berhenti
                continue
            a = data.get("pengingat") or {}
            langganan = db.scalars(select(LanggananPush).where(LanggananPush.akun_id == d.akun_id)).all() if a.get("push") else []
            if not langganan and not a.get("email"):
                continue
            zona = ZoneInfo((data.get("profil") or {}).get("zonaWaktu") or "Asia/Jakarta")
            lokal = sekarang_utc.astimezone(zona)
            sudah = {(nid, k) for nid, k in db.execute(select(PengingatTerkirim.notif_id, PengingatTerkirim.kanal).where(PengingatTerkirim.akun_id == d.akun_id))}
            akun = db.get(Akun, d.akun_id)
            for n in jadwalkan(data, lokal.date()):
                if _menit(n.jam) > lokal.hour * 60 + lokal.minute:
                    continue
                url = f"{settings.app_url.rstrip('/')}/saya/notifikasi#{n.id}"
                if langganan and (n.id, "push") not in sudah:
                    berhasil = False
                    for lg in langganan:
                        hasil = kirim_push(json.loads(dekripsi(lg.isi_enkripsi)), "RAMBU", n.isi, url, n.id)
                        if hasil == "hilang":
                            db.delete(lg)  # izin dicabut atau perangkat tidak aktif
                        berhasil = berhasil or hasil == "terkirim"
                    if berhasil:
                        db.add(PengingatTerkirim(akun_id=d.akun_id, notif_id=n.id, kanal="push"))
                        terkirim += 1
                # Email: kanal yang dipilih pengguna, juga cadangan bila notifikasi mati
                if a.get("email") and (n.id, "email") not in sudah:
                    if kirim_email(dekripsi(akun.email_enkripsi), "Pengingat RAMBU", f"{n.isi}\n\nBuka RAMBU: {url}"):
                        db.add(PengingatTerkirim(akun_id=d.akun_id, notif_id=n.id, kanal="email"))
                        terkirim += 1
        db.commit()
    return terkirim


async def loop_penjadwal() -> None:
    while True:
        try:
            await asyncio.to_thread(jalankan_sekali)
        except Exception as exc:  # pragma: no cover
            log.warning("penjadwal pengingat gagal: %s", type(exc).__name__)
        await asyncio.sleep(settings.pengingat_interval_s)
