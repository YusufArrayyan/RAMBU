"""Penjelasan hasil dalam bahasa awam (FR-17).

Alur pagar pengaman dari PRD:
1. Mesin hitung menghasilkan semua angka.
2. Model bahasa menyusun penjelasan dan hanya boleh memakai angka dari daftar resmi.
3. Pemeriksa keluaran menolak penjelasan yang memuat angka di luar daftar, kalimat
   yang menyuruh meminjam atau tidak, atau janji hasil.
4. Bila ditolak atau AI tidak tersedia, layar menampilkan penjelasan templat statis.
"""

from __future__ import annotations

import logging

from .engine import Hasil, Masukan
from .formatting import persen, rupiah
from .pemeriksa import HasilPeriksa, kumpulkan_angka, periksa_teks

log = logging.getLogger(__name__)


def angka_resmi(m: Masukan, h: Hasil) -> dict[str, str]:
    """Daftar angka yang boleh muncul di penjelasan, sudah dalam format tampilan."""
    d = {
        "pinjaman": rupiah(m.pokok),
        "tenor_hari": f"{m.tenor} hari",
        "bunga_harian": persen(m.bunga_harian_persen, 3),
        "admin_persen": persen(m.admin_persen, 2),
        "biaya_admin": rupiah(h.admin),
        "bunga_total": rupiah(h.bunga),
        "dana_diterima": rupiah(h.diterima),
        "total_bayar": rupiah(h.total),
        "biaya_pinjaman": rupiah(h.biaya),
        "jumlah_cicilan": f"{h.jumlah_cicilan} kali",
        "cicilan_per_bulan": rupiah(h.cicilan),
        "biaya_efektif_harian": persen(h.efektif_harian_persen, 2),
        "patokan_rasio": persen(h.patokan_persen, 0),
    }
    if h.batas_tipe == "tunggal":
        d["batas_harian"] = persen(h.batas_persen, 3)
    else:
        d["batas_harian_min"] = persen(h.batas_min, 1)
        d["batas_harian_maks"] = persen(h.batas_maks, 1)
    if m.penghasilan:
        d["penghasilan"] = rupiah(m.penghasilan)
    if m.cicilan_lain:
        d["cicilan_lain"] = rupiah(m.cicilan_lain)
    if h.rasio_persen is not None:
        d["rasio_cicilan"] = persen(h.rasio_persen, 1)
        d["rasio_cicilan_ini_saja"] = persen(h.rasio_sendiri_persen, 1)
    return d


def kalimat_batas(h: Hasil) -> str:
    """Sama dengan frontend/src/lib/explain.ts:kalimatBatas. Tidak pernah menyatakan penyelenggara melanggar."""
    teks = persen(h.batas_persen, 3) if h.batas_tipe == "tunggal" else f"{persen(h.batas_min, 1)} sampai {persen(h.batas_maks, 1)}"
    return {
        "bawah_batas": f"Biaya efektif, termasuk admin, di bawah batas {teks} per hari (perkiraan).",
        "atas_batas": f"Biaya efektif, termasuk admin, di atas batas {teks} per hari (perkiraan).",
        "bawah_keduanya": f"Di bawah batas {teks} per hari, dengan dan tanpa admin (perkiraan).",
        "atas_jika_admin": f"Bunga saja di bawah batas {teks} per hari, tetapi di atas batas jika admin dihitung (perkiraan).",
        "atas_bunga": f"Di atas batas {teks} per hari, bahkan tanpa admin (perkiraan).",
        "belum_pasti": f"Batas untuk tenor lebih dari enam bulan antara {teks} per hari dan belum jelas; angka ini berada di rentang itu.",
    }[h.status_batas]


def penjelasan_templat(m: Masukan, h: Hasil) -> str:
    a = angka_resmi(m, h)
    kalimat = [
        f"Dari pinjaman {a['pinjaman']}, dana yang kamu terima {a['dana_diterima']} "
        f"karena biaya admin {a['biaya_admin']} dipotong di muka.",
        f"Selama {a['tenor_hari']}, bunganya {a['bunga_total']}, jadi total yang harus kamu kembalikan "
        f"{a['total_bayar']}. Selisih {a['biaya_pinjaman']} itulah biaya pinjamanmu.",
    ]
    if h.jumlah_cicilan == 1:
        kalimat.append(f"Pinjaman ini dibayar sekali, sebesar {a['cicilan_per_bulan']}.")
    else:
        kalimat.append(f"Kalau dibagi rata {a['jumlah_cicilan']}, cicilannya sekitar {a['cicilan_per_bulan']} per bulan.")
    if h.rasio_persen is None:
        kalimat.append("Rasio cicilan terhadap penghasilan tidak dapat dihitung karena penghasilan belum diisi.")
    else:
        posisi = "di atas" if h.di_atas_patokan else "dalam"
        kalimat.append(f"Bersama cicilan lain, cicilan itu {a['rasio_cicilan']} dari penghasilanmu, {posisi} patokan {a['patokan_rasio']}.")
    kalimat.append(f"Biaya efektifnya sekitar {a['biaya_efektif_harian']} per hari. {kalimat_batas(h)}")
    return " ".join(kalimat)


# --- Pemeriksa keluaran -------------------------------------------------------


def periksa(teks: str, resmi: dict[str, str]) -> HasilPeriksa:
    """Penjelasan hanya boleh memakai angka dari keluaran mesin hitung."""
    return periksa_teks(teks, kumpulkan_angka(resmi.values()))


# --- Penjelasan oleh model bahasa --------------------------------------------

SYSTEM_PROMPT = """Kamu menulis penjelasan singkat untuk RAMBU, alat bantu yang membantu calon peminjam membaca penawaran pinjaman daring.

Tugasmu hanya menjelaskan hasil hitungan yang sudah jadi dalam bahasa Indonesia yang awam, ramah, dan tenang. Sapa pembaca dengan "kamu". Tulis 3 sampai 4 kalimat pendek dalam satu paragraf, tanpa judul, daftar, atau format markdown.

Aturan angka: pakai hanya angka dari ANGKA_RESMI, persis seperti tertulis (misalnya "Rp3.810.000" atau "31,8%"). Jangan pernah menyingkat menjadi "juta" atau "ribu". Jangan menghitung, membulatkan, menjumlahkan, atau menulis angka lain dalam bentuk apa pun, termasuk tahun, urutan, atau angka yang ditulis dengan kata. Kalau sebuah gagasan butuh angka yang tidak ada di ANGKA_RESMI, tulis gagasan itu tanpa angka.

Aturan isi: jelaskan apa arti angkanya, bukan apa yang harus dilakukan. Jangan menyarankan untuk meminjam atau tidak meminjam, jangan menilai penyelenggara, dan jangan menjanjikan hasil. Untuk batas OJK, salin makna posisi_batas_harian dan sebut bahwa ini perkiraan; jangan pernah menyatakan penyelenggara melanggar. Rasio 30% adalah patokan: batas yang dipakai penyelenggara saat menilai kemampuan bayar, dihitung dari cicilan ke seluruh kreditur."""


def _pesan_pengguna(resmi: dict[str, str], h: Hasil) -> str:
    baris = "\n".join(f"- {k}: {v}" for k, v in resmi.items())
    status = [
        f"posisi_batas_harian: {kalimat_batas(h)}",
        "di_atas_patokan_rasio: " + ("tidak dapat dihitung" if h.di_atas_patokan is None else ("ya" if h.di_atas_patokan else "tidak")),
    ]
    return f"ANGKA_RESMI:\n{baris}\n\nSTATUS:\n" + "\n".join(f"- {s}" for s in status)


def penjelasan_ai(m: Masukan, h: Hasil) -> tuple[str, list[str], str | None]:
    """Kembalikan (teks, alasan, penolakan). Teks kosong berarti pakai templat.

    penolakan: "pemeriksa" bila ditolak kode, "layanan" bila model gagal atau menolak.
    """
    from .ai import client, refused, text_of

    resmi = angka_resmi(m, h)
    try:
        response = client().beta.messages.create(
            model=_model(),
            max_tokens=4000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "low"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _pesan_pengguna(resmi, h)}],
        )
    except Exception as exc:  # jaringan, kuota, dsb. -> templat
        log.warning("penjelasan AI gagal: %s", type(exc).__name__)
        return "", ["layanan AI sedang tidak tersedia"], "layanan"

    if refused(response):
        return "", ["model menolak permintaan ini"], "layanan"
    teks = " ".join(text_of(response).split())
    hasil = periksa(teks, resmi)
    if not hasil.lolos:
        log.info("penjelasan AI ditolak pemeriksa: %s", hasil.alasan)
        return "", hasil.alasan, "pemeriksa"
    return teks, [], None


def _model() -> str:
    from .config import settings

    return settings.model


__all__ = ["angka_resmi", "kalimat_batas", "penjelasan_templat", "periksa", "penjelasan_ai"]
