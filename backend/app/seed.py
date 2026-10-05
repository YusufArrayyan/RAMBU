"""Data contoh untuk panel admin di lingkungan pengembangan (RAMBU_SEED_CONTOH).

Semua isi di sini rekaan dan diberi label DATA CONTOH di antarmuka. Tidak pernah dijalankan
di produksi. Token admin contoh tercatat di backend/.env.example.
"""

from __future__ import annotations

import secrets
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .db import AdminRAMBU, KontenKlausul, LogAudit, LogPemeriksa, VersiParameter, kini
from .keamanan import hash_hmac
from .regulasi import versi_aktif

ADMIN_CONTOH = [
    ("Penyunting Contoh", "penyunting@rambu.local", "penyunting", "contoh-penyunting"),
    ("Peninjau Contoh", "peninjau@rambu.local", "peninjau", "contoh-peninjau"),
    ("Analis Contoh", "analis@rambu.local", "analis", "contoh-analis"),
    ("Superadmin Contoh", "superadmin@rambu.local", "superadmin", "contoh-superadmin"),
    ("Mitra Contoh (kampus)", "mitra@rambu.local", "mitra", "contoh-mitra"),
]

# Tujuh kategori usulan PRD 13.1. Penjelasan tetap ditulis RAMBU; kutipan contoh rekaan.
KLAUSUL = [
    ("denda", "Denda dan keterlambatan", "Denda tidak termasuk dalam hitungan RAMBU. Tanyakan besar denda per hari dan apakah ada batas maksimalnya.", "Perlu ketentuan OJK terbaru", "Keterlambatan dikenakan denda 0,5% per hari dari jumlah tertunggak.", "terbit"),
    ("sepihak", "Perubahan syarat sepihak", "Klausul yang membolehkan pemberi pinjaman mengubah syarat tanpa persetujuanmu diatur dalam UU Perlindungan Konsumen Pasal 18.", "UU 8/1999 Pasal 18", "Pemberi pinjaman berhak mengubah syarat sewaktu-waktu tanpa pemberitahuan.", "terbit"),
    ("akses_data", "Akses data dan izin perangkat", "Izin akses perangkat diatur OJK. Periksa izin yang benar-benar diperlukan aplikasi.", "Pernyataan OJK (sekunder, CNBC Indonesia 21 Agustus 2024)", "Pengguna memberikan izin akses kontak dan galeri perangkat.", "terbit"),
    ("pelunasan", "Pelunasan dipercepat dan penalti", "Periksa apakah melunasi lebih awal dikenai biaya, dan berapa.", "Perlu ketentuan", "Pelunasan sebelum jatuh tempo dikenakan biaya.", "ditinjau"),
    ("biaya_lain", "Biaya tambahan lain", "Biaya seperti asuransi atau perpanjangan menambah total yang dibayar di luar bunga dan admin.", "Perlu ketentuan", "Asuransi dan biaya perpanjangan ditagihkan terpisah.", "ditinjau"),
    ("penagihan", "Penagihan dan pihak ketiga", "Periksa siapa yang boleh menagih dan bagaimana caranya. Penagihan harus sesuai aturan OJK.", "Perlu ketentuan OJK", "Penagihan dapat dilakukan melalui pihak ketiga.", "draf"),
    ("sengketa", "Penyelesaian sengketa dan hukum berlaku", "Periksa ke mana sengketa dibawa dan hukum yang berlaku.", "Perlu ketentuan", "Sengketa diselesaikan di pengadilan yang ditunjuk pemberi pinjaman.", "draf"),
]


def seed(db: Session) -> None:
    if settings.produksi or not settings.seed_contoh:
        return
    if not db.scalar(select(func.count(AdminRAMBU.id))):
        for nama, email, peran, token in ADMIN_CONTOH:
            if settings.seed_token_rahasia:
                token = f"{token}-{settings.seed_token_rahasia}"
            db.add(AdminRAMBU(nama=nama, email=email, peran=peran, token_hash=hash_hmac(token, "admin")))
        db.flush()
    if not db.scalar(select(func.count(KontenKlausul.id))):
        for kat, judul, penj, ruj, kutip, status in KLAUSUL:
            db.add(KontenKlausul(kategori=kat, judul=judul, penjelasan=penj, rujukan=ruj, contoh_kutipan=kutip, status=status, diubah_oleh="Penyunting Contoh"))
    if not db.scalar(select(func.count(VersiParameter.id))):
        penyunting = db.scalar(select(AdminRAMBU).where(AdminRAMBU.peran == "penyunting"))
        dasar = versi_aktif().mentah
        usul = [dict(b) for b in dasar["batas_harian"]]
        for b in usul:
            if b["id"] == "semua_lebih6":
                b["sumber"] = "Draf contoh: pemetaan segmen tenor lebih dari 6 bulan menunggu teks ketentuan"
        db.add(
            VersiParameter(
                versi="2026.11.1",
                isi={**dasar, "id": "2026.11.1", "status": "menunggu", "batas_harian": usul},
                status="menunggu",
                catatan="Perubahan batas tenor lebih dari 6 bulan (DATA CONTOH)",
                pengaju_id=penyunting.id if penyunting else None,
            )
        )
        db.add(LogAudit(aktor="Peninjau Contoh", peran="peninjau", aksi="terbitkan_parameter", objek=f"parameter {dasar['id']}", detail="DATA CONTOH"))
        db.add(LogAudit(aktor="Penyunting Contoh", peran="penyunting", aksi="ajukan_parameter", objek="parameter 2026.11.1", detail="DATA CONTOH"))
        db.add(LogAudit(aktor="Penyunting Contoh", peran="penyunting", aksi="sunting_klausul", objek="klausul penagihan", detail="DATA CONTOH"))
    if not db.scalar(select(func.count(LogPemeriksa.id))):
        rng = secrets.SystemRandom()
        alasan = ["kutipan tidak ada di teks", "memuat angka yang tidak ada di hasil mesin hitung", "memakai singkatan seperti juta atau ribu, bukan angka utuh", "memuat kalimat anjuran atau penilaian"]
        jenis = ["baca_dokumen", "obrolan", "uji_paham", "penjelasan"]
        for hari in range(7):
            for _ in range(rng.randint(30, 70)):
                ditolak = rng.random() < 0.06
                db.add(
                    LogPemeriksa(
                        waktu=kini() - timedelta(days=hari, minutes=rng.randint(0, 1400)),
                        jenis=rng.choice(jenis),
                        hasil="ditolak" if ditolak else "lolos",
                        alasan=(rng.choices(alasan, weights=[5, 2, 2, 1])[0] if ditolak else ""),
                        kode=f"c{secrets.token_hex(3)}",
                    )
                )
    db.commit()
