@echo off
rem Backend untuk menguji tampilan fitur AI tanpa memanggil model sungguhan:
rem kunci palsu dan alamat model yang tidak bisa dijangkau, jadi setiap panggilan gagal cepat.
set ANTHROPIC_API_KEY=sk-ant-palsu-uji
set ANTHROPIC_BASE_URL=http://127.0.0.1:9
set RAMBU_AI_ENABLED=true
set RAMBU_ADMIN_TOKEN=uji-lokal
cd /d "%~dp0..\backend"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
