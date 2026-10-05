"""Lingkungan uji diatur sebelum modul app diimpor."""

import os

os.environ["RAMBU_DATABASE_URL"] = "sqlite://"
os.environ["RAMBU_ADMIN_TOKEN"] = "rahasia-uji"
os.environ["RAMBU_AI_ENABLED"] = "false"
os.environ["RAMBU_ENV"] = "development"
os.environ["RAMBU_SECRET_KEY"] = "kunci-uji-saja"
os.environ["RAMBU_SMTP_HOST"] = ""
os.environ["RAMBU_SEED_CONTOH"] = "true"
