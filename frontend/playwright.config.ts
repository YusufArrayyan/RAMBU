/**
 * Uji ujung ke ujung (PRD 17.2) terhadap build produksi yang disajikan FastAPI, sehingga
 * Service Worker offline ikut teruji. Memakai Microsoft Edge yang terpasang (tanpa unduh peramban).
 * Jalankan: npm run build && npm run e2e
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8123;
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backend");
const python = process.platform === "win32" ? path.join(backend, ".venv/Scripts/python.exe") : path.join(backend, ".venv/bin/python");

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "msedge",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "ponsel", use: { ...devices["Pixel 7"], channel: process.env.PW_CHANNEL ?? "msedge" } },
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
  ],
  webServer: {
    command: `"${python}" -m uvicorn app.main:app --app-dir "${backend}" --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      RAMBU_DATABASE_URL: "sqlite:///" + path.join(backend, "e2e.db").replace(/\\/g, "/"),
      RAMBU_ENV: "development",
      RAMBU_AI_ENABLED: "false",
      RAMBU_SMTP_HOST: "",
      RAMBU_SEED_CONTOH: "true",
      RAMBU_APP_URL: `http://127.0.0.1:${PORT}`,
      RAMBU_CORS_ORIGINS: `http://127.0.0.1:${PORT}`,
    },
  },
});
