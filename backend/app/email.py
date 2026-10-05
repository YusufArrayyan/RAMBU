"""Pengiriman email (tautan masuk, pengingat cadangan). SMTP bila dikonfigurasi."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from .config import settings

log = logging.getLogger(__name__)


def kirim_email(ke: str, judul: str, isi: str) -> bool:
    """Kembalikan True bila terkirim lewat SMTP. Tanpa SMTP: tidak dikirim, isi tidak dicatat ke log."""
    if not settings.email_tersedia:
        log.info("email tidak dikirim: RAMBU_SMTP_HOST belum diisi (%s)", judul)
        return False
    pesan = EmailMessage()
    pesan["From"] = settings.smtp_from
    pesan["To"] = ke
    pesan["Subject"] = judul
    pesan.set_content(isi)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(pesan)
        return True
    except (OSError, smtplib.SMTPException) as exc:
        log.warning("email gagal: %s", type(exc).__name__)
        return False
