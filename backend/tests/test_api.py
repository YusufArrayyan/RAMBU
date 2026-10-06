import io
import json

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from sqlalchemy import select  # noqa: E402

from app import db  # noqa: E402

# Satu koneksi memori yang dipakai bersama agar tabel tetap ada antar-permintaan.
db.engine = db.create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
db.SessionLocal.configure(bind=db.engine)
db.init_db()

from app.dokumen import siapkan_gambar  # noqa: E402
from app.main import app  # noqa: E402
from app.pengingat import geser, jadwalkan  # noqa: E402
from app.ratelimit import reset  # noqa: E402

CONTOH = {"pokok": 3000000, "tenor": 90, "bunga_harian_persen": 0.1, "admin_persen": 2, "penghasilan": 4000000, "cicilan_lain": 300000}
H = lambda token: {"Authorization": f"Bearer {token}"}  # noqa: E731


def klien() -> TestClient:
    return TestClient(app)


def test_health_dan_config():
    with klien() as c:
        assert c.get("/api/health").json() == {"status": "ok"}
        cfg = c.get("/api/config").json()
        assert cfg["ai_tersedia"] is False
        assert cfg["akun_tersedia"] is True
        assert cfg["regulasi_aktif"]["patokan_rasio"]["persen"] == 30
        assert cfg["kanal_pengaduan"]["telepon"] == "157"


def test_hitung_dan_kontrafaktual():
    with klien() as c:
        body = c.post("/api/hitung", json=CONTOH).json()
        assert body["tampilan"]["total_bayar"] == "Rp3.270.000"
        assert body["hasil"]["status_batas"] == "bawah_batas"
        # Id segmen lama dari perangkat yang belum diperbarui tetap diterima sebagai konsumtif.
        lama = c.post("/api/hitung", json={**CONTOH, "segmen": "konsumtif_kecil"}).json()
        assert lama["hasil"]["batas_persen"] == 0.3
        assert body["kontrafaktual"]["pokok_maks"] == 2_477_000
        assert body["label"] == "Perkiraan"
        assert c.post("/api/hitung", json={**CONTOH, "tenor": 0}).status_code == 422
        assert c.post("/api/hitung", json={**CONTOH, "nik": "123"}).status_code == 422


def test_jelaskan_tanpa_ai_memakai_templat():
    with klien() as c:
        r = c.post("/api/ai/jelaskan", json=CONTOH).json()
        assert r["sumber"] == "templat" and r["penolakan"] == "nonaktif"
        assert "Rp3.270.000" in r["teks"]


def test_endpoint_ai_tanpa_ai_503():
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(buf, format="PNG")
    with klien() as c:
        assert c.post("/api/ai/salin-gambar", files={"gambar": ("a.png", buf.getvalue(), "image/png")}).status_code == 503
        assert c.post("/api/ai/baca-dokumen", json={"teks": "Pinjaman Rp3.000.000"}).status_code == 503
        assert c.post("/api/ai/baca-jawaban", json={"teks": "aku terima 2,8 juta"}).status_code == 503
        assert c.post("/api/ai/wawancara", json={"pesan": [{"peran": "pengguna", "teks": "halo"}]}).status_code == 503


def test_event_hanya_kamus_16_2():
    with klien() as c:
        ok = c.post("/api/events", json={"nama": "offer_calculated", "props": {"input_method": "manual", "segmen": "produktif"}, "sid": "abcdefgh12"})
        assert ok.status_code == 204
        # nilai uang, properti asing, event di luar kamus: ditolak
        assert c.post("/api/events", json={"nama": "offer_calculated", "props": {"pokok": "3000000"}, "sid": "abcdefgh12"}).status_code == 422
        assert c.post("/api/events", json={"nama": "offer_calculated", "props": {"segmen": "Rp3.000.000"}, "sid": "abcdefgh12"}).status_code == 422
        assert c.post("/api/events", json={"nama": "klik_iklan", "sid": "abcdefgh12"}).status_code == 422
        assert c.post("/api/events", json={"nama": "export_data", "sid": "abcdefgh12", "email": "a@b.c"}).status_code == 422
        assert c.post("/api/events", json={"nama": "reminder_enabled", "props": {"aturan": "H-3 H-1 Hari H"}, "sid": "abcdefgh12"}).status_code == 204


def test_akun_tautan_kode_data_hapus():
    """ACC-01, ACC-04, ACC-05/07 (cadangan), AC-14 (hapus akun)."""
    reset()
    with klien() as c:
        assert c.post("/api/akun/tautan", json={"email": "dina@contoh.id", "setuju_usia": False}).status_code == 422
        r = c.post("/api/akun/tautan", json={"email": "dina@contoh.id", "setuju_usia": True}).json()
        assert r["berlaku_menit"] == 15
        kode = r["kode_pengembangan"]  # pengembangan tanpa SMTP
        salah = "000000" if kode != "000000" else "111111"
        assert c.post("/api/akun/verifikasi", json={"email": "dina@contoh.id", "kode": salah}).status_code == 400
        v = c.post("/api/akun/verifikasi", json={"email": "dina@contoh.id", "kode": kode}).json()
        token = v["token"]
        assert v["baru"] is True and v["email"] == "dina@contoh.id"
        # kode sekali pakai
        assert c.post("/api/akun/verifikasi", json={"email": "dina@contoh.id", "kode": kode}).status_code == 400
        assert c.get("/api/akun/data").status_code == 401
        data = {"profil": {"penghasilan": 4000000, "zonaWaktu": "Asia/Jakarta"}, "pinjaman": [{"id": "a", "nama": "A", "cicilan": [], "pembayaran": []}], "pengingat": {"email": True}}
        assert c.put("/api/akun/data", headers=H(token), content=json.dumps(data)).status_code == 204
        assert c.get("/api/akun/data", headers=H(token)).json()["pinjaman"][0]["nama"] == "A"
        # tersimpan terenkripsi, bukan teks biasa
        with db.SessionLocal() as s:
            mentah = s.scalars(select(db.DataAkun)).first().isi_enkripsi
            assert b"4000000" not in mentah
            assert b"dina@contoh.id" not in s.scalars(select(db.Akun)).first().email_enkripsi
        assert c.delete("/api/akun", headers=H(token)).status_code == 204
        assert c.get("/api/akun/data", headers=H(token)).status_code == 401
        with db.SessionLocal() as s:
            assert s.scalars(select(db.DataAkun)).first() is None
            assert s.scalars(select(db.Akun)).first() is None


def test_admin_aturan_dua_orang_ac17():
    with klien() as c:
        assert c.get("/api/admin/dasbor").status_code == 401
        assert c.get("/api/admin/dasbor", headers=H("contoh-mitra")).status_code == 403
        draf = {
            "versi": "2026.12.1",
            "berlaku_mulai": "2026-12-01",
            "batas_harian": [
                {"id": "konsumtif_mikro_maks6", "segmen": "konsumtif_mikro", "tenor_maks_hari": 180, "persen": 0.3, "sumber": "SP OJK 76/OJK/GKPB/V/2025"},
                {"id": "tanpa_sumber", "segmen": "semua", "tenor_maks_hari": None, "persen": 0.2, "sumber": ""},
            ],
            "patokan_persen": 30,
            "catatan": "Uji aturan dua orang",
        }
        r = c.post("/api/admin/parameter", headers=H("contoh-penyunting"), json=draf).json()
        assert r["status"] == "menunggu"
        assert next(b for b in r["isi"]["batas_harian"] if b["id"] == "tanpa_sumber")["status"] == "nonaktif"
        # pengaju tidak bisa menyetujui sendiri; analis tidak berwenang
        assert c.post(f"/api/admin/parameter/{r['id']}/setujui", headers=H("contoh-penyunting")).status_code == 403
        assert c.post(f"/api/admin/parameter/{r['id']}/setujui", headers=H("contoh-analis")).status_code == 403
        ok = c.post(f"/api/admin/parameter/{r['id']}/setujui", headers=H("contoh-peninjau")).json()
        assert ok["status"] == "terbit" and ok["penyetuju"].startswith("Peninjau")
        versi = [v["id"] for v in c.get("/api/regulasi").json()["versi"]]
        assert "2026.12.1" in versi
        audit = c.get("/api/admin/audit", headers=H("contoh-peninjau")).json()
        assert any(a["aksi"] == "terbitkan_parameter" and "2026.12.1" in a["objek"] for a in audit)


def test_admin_klausul_dan_log_tanpa_isi_pengguna():
    with klien() as c:
        kl = c.get("/api/admin/klausul", headers=H("contoh-penyunting")).json()
        assert len(kl) == 7
        k = kl[0]
        body = {"judul": k["judul"], "penjelasan": k["penjelasan"] + " Diperbarui.", "rujukan": k["rujukan"], "contoh_kutipan": k["contoh_kutipan"]}
        assert c.put(f"/api/admin/klausul/{k['id']}", headers=H("contoh-penyunting"), json=body).json()["status"] == "draf"
        assert c.post(f"/api/admin/klausul/{k['id']}/status", headers=H("contoh-penyunting"), json={"status": "terbit"}).status_code == 403
        c.post(f"/api/admin/klausul/{k['id']}/status", headers=H("contoh-penyunting"), json={"status": "ditinjau"})
        assert c.post(f"/api/admin/klausul/{k['id']}/status", headers=H("contoh-peninjau"), json={"status": "terbit"}).json()["status"] == "terbit"
        log = c.get("/api/admin/log-pemeriksa", headers=H("contoh-analis")).json()
        assert set(log["baris"][0]) == {"waktu", "jenis", "hasil", "alasan", "kode"}


def test_mitra_k_anonim():
    with klien() as c:
        r = c.get("/api/mitra/laporan", headers=H("contoh-mitra")).json()
        assert r["k_minimum"] == 20
        # sedikit sesi uji: kelompok kecil disembunyikan
        assert r["sesi_cek"] is None or r["sesi_cek"] >= 20
        assert c.get("/api/mitra/laporan", headers=H("contoh-penyunting")).status_code == 403
        assert c.get("/api/admin/parameter", headers=H("contoh-mitra")).status_code == 403


def test_penjadwal_server_sama_dengan_klien():
    data = {
        "pinjaman": [
            {"id": "a", "cicilan": [{"id": "c1", "ke": 1, "jatuhTempo": "2026-10-12", "jumlah": 1090000}], "pembayaran": []},
            {"id": "b", "cicilan": [{"id": "c2", "ke": 1, "jatuhTempo": "2026-10-12", "jumlah": 300000}], "pembayaran": []},
        ],
        "pengingat": {"offsets": [-3, -1, 0, 1, 3], "jamKirim": "09:00", "jamTenangMulai": "21:00", "jamTenangSelesai": "07:00", "maksPerHari": 5, "privasi": True},
    }
    from datetime import date

    n = jadwalkan(data, date(2026, 10, 9))
    assert len(n) == 1 and n[0].pemicu == "H-3" and "2 cicilan" in n[0].isi.lower() and "Rp" not in n[0].isi
    assert n[0].id == "2026-10-09-H-3-2026-10-12"
    assert geser(date(2026, 10, 9), "22:00", "21:00", "07:00") == (date(2026, 10, 10), "07:00")
    data["pinjaman"][0]["pembayaran"].append({"cicilanId": "c1", "jumlah": 1090000})
    data["pinjaman"][1]["pembayaran"].append({"cicilanId": "c2", "jumlah": 300000})
    assert jadwalkan(data, date(2026, 10, 11)) == []


def test_siapkan_gambar_membuang_metadata_dan_menolak_gif():
    buf = io.BytesIO()
    Image.new("RGB", (3000, 1500), "white").save(buf, format="PNG")
    media, b64 = siapkan_gambar(buf.getvalue())
    assert media == "image/jpeg" and len(b64) > 0
    gif = io.BytesIO()
    Image.new("RGB", (10, 10)).save(gif, format="GIF")
    try:
        siapkan_gambar(gif.getvalue())
        raise AssertionError("GIF seharusnya ditolak")
    except ValueError:
        pass


def _langganan_palsu() -> dict:
    """Kunci klien ECDH asli agar enkripsi Web Push (RFC 8291) benar-benar dijalankan."""
    import base64
    import os as _os

    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    k = ec.generate_private_key(ec.SECP256R1())
    pub = k.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()  # noqa: E731
    return {"endpoint": "https://push.contoh.test/kirim/abc123", "keys": {"p256dh": b64(pub), "auth": b64(_os.urandom(16))}}


def test_web_push_langganan_kirim_dan_cabut(monkeypatch):
    """ING-05: langganan tersimpan terenkripsi; keluar mencabut langganan perangkat itu."""
    import pywebpush

    from app.pengingat import jalankan_sekali
    from app.push import kirim_push

    terkirim = []

    class Respon:
        status_code = 201
        text = ""
        headers: dict = {}

    monkeypatch.setattr(pywebpush.requests, "post", lambda url, **kw: (terkirim.append((url, kw)), Respon())[1])
    lg = _langganan_palsu()
    assert kirim_push(lg, "RAMBU", "Cicilan jatuh tempo besok.", "https://contoh/saya", "t1") == "terkirim"
    url, kw = terkirim[0]
    assert url == lg["endpoint"]
    assert kw["headers"]["Content-Encoding"] == "aes128gcm"
    assert b"Cicilan" not in kw["data"]  # isi terenkripsi
    assert kw["headers"]["Authorization"].startswith("vapid ")

    reset()
    with klien() as c:
        assert c.get("/api/config").json()["push_tersedia"] is True
        assert len(c.get("/api/akun/push/kunci").json()["kunci_publik"]) == 87
        kode = c.post("/api/akun/tautan", json={"email": "raka@contoh.id", "setuju_usia": True}).json()["kode_pengembangan"]
        token = c.post("/api/akun/verifikasi", json={"email": "raka@contoh.id", "kode": kode}).json()["token"]
        assert c.post("/api/akun/push/langganan", json=lg).status_code == 401
        assert c.post("/api/akun/push/langganan", headers=H(token), json=lg).status_code == 204
        with db.SessionLocal() as s:
            mentah = s.scalars(select(db.LanggananPush)).first().isi_enkripsi
            assert b"push.contoh.test" not in mentah
        # penjadwal: pengingat hari H dikirim lewat push, sekali saja
        from datetime import datetime, timezone

        hari_ini = datetime.now(timezone.utc).astimezone().date().isoformat()
        data = {
            "profil": {"zonaWaktu": "Asia/Jakarta"},
            "pinjaman": [{"id": "p", "nama": "P", "cicilan": [{"id": "c", "ke": 1, "jatuhTempo": hari_ini, "jumlah": 100000}], "pembayaran": []}],
            "pengingat": {"offsets": [0], "jamKirim": "00:00", "jamTenangMulai": "00:00", "jamTenangSelesai": "00:00", "maksPerHari": 5, "privasi": True, "push": True, "email": False},
        }
        c.put("/api/akun/data", headers=H(token), content=json.dumps(data))
        terkirim.clear()
        from zoneinfo import ZoneInfo

        siang = datetime.now(ZoneInfo("Asia/Jakarta")).replace(hour=12)
        assert jalankan_sekali(siang) == 1
        assert jalankan_sekali(siang) == 0  # tidak dikirim dua kali
        assert c.post("/api/akun/keluar", headers=H(token)).status_code == 204
        with db.SessionLocal() as s:
            assert s.scalars(select(db.LanggananPush)).first() is None
