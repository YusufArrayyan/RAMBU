/**
 * Uji ujung ke ujung RAMBU v4 (PRD 17.1, 17.2). Waktu dibekukan pada 5 Okt 2026 09.00 WIB agar
 * tanggal dan status cicilan deterministik.
 */
import { expect, test, type Page } from "@playwright/test";

const SEKARANG = new Date("2026-10-05T09:00:00+07:00");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(SEKARANG);
});

/** Tombol aksi yang terlihat (aksi bawah dirender dua kali: menempel di ponsel, sebaris di desktop). */
const tombol = (page: Page, nama: string | RegExp) => page.getByRole("button", { name: nama }).filter({ visible: true }).first();
const tautan = (page: Page, nama: string | RegExp) => page.getByRole("link", { name: nama }).filter({ visible: true }).first();

async function mulaiTamu(page: Page, penghasilan = "4000000") {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pahami pinjamanmu sebelum setuju." })).toBeVisible();
  await tautan(page, "Mulai").click();
  await expect(page.getByRole("radio", { name: /Tamu/ })).toHaveAttribute("aria-checked", "true");
  await tombol(page, "Lanjut").click();
  await page.getByLabel("Penghasilan per bulan").fill(penghasilan);
  await page.getByLabel("Tanggal gajian").fill("25");
  await tombol(page, "Simpan").click();
  await expect(page).toHaveURL(/\/beranda$/);
}

async function isiCekDina(page: Page) {
  await page.goto("/cek");
  await page.getByLabel("Nilai pinjaman").fill("3000000");
  await page.getByLabel("Tenor").fill("90");
  await page.getByLabel("Bunga", { exact: true }).fill("0,1");
  await page.getByLabel("Biaya admin").fill("2");
  await tombol(page, "Hitung biaya sebenarnya").click();
  await expect(page).toHaveURL(/\/cek\/hasil$/);
}

test("AC-01 s.d. AC-04: biaya, rasio, telusur, kontrastif, kontrafaktual", async ({ page }) => {
  await mulaiTamu(page);
  await isiCekDina(page);
  await expect(page.getByRole("heading", { name: /Kamu menerima Rp2\.940\.000, tapi membayar Rp3\.270\.000/ })).toBeVisible();
  await expect(page.getByText("3 × Rp1.090.000")).toBeVisible();
  await expect(page.getByText("Rp330.000", { exact: true })).toBeVisible();

  // Cicilan lain Rp300.000 (S12)
  await tombol(page, "Lanjut ke semua cicilan").click();
  await tombol(page, "Tambah cicilan").click();
  const lembar = page.getByRole("dialog");
  await lembar.getByLabel("Nama").fill("Paylater Contoh B");
  await lembar.getByLabel("Cicilan per bulan").fill("300000");
  await lembar.getByLabel("Sisa").fill("5");
  await lembar.getByRole("button", { name: "Tambah", exact: true }).click();
  await expect(page.getByText("57,9%")).toBeVisible(); // uji tekanan turun 40%

  // AC-02
  await page.goto("/cek/hasil");
  await expect(page.getByText("27,3%", { exact: true })).toBeVisible();
  await expect(page.getByText("34,8%", { exact: true })).toBeVisible();
  await expect(page.getByText("Di atas patokan 30%")).toBeVisible();

  // XAI-01 telusur dari fungsi yang sama
  await page.getByRole("button", { name: "Dari mana angka total bayar?" }).click();
  await expect(page.getByRole("dialog")).toContainText("3.000.000 + 3.000.000 × 0,001 × 90");
  await page.getByRole("dialog").getByRole("button", { name: "Tutup" }).click();

  // XAI-02 kontrastif
  await page.goto("/cek/penjelasan?tab=kenapa");
  await expect(page.getByText("7,5 poin persentase")).toBeVisible();

  // AC-04 kontrafaktual
  await page.goto("/cek/penjelasan?tab=ubah");
  const kartu = page.getByRole("tabpanel");
  await expect(kartu).toContainText("≈ Rp2.477.000");
  await expect(kartu).toContainText("Rp110.000");
  await expect(kartu).toContainText("≈ Rp4.634.000");
  await expect(kartu).toContainText("syarat lain tetap");
  await expect(kartu).toContainText("Ini informasi, bukan saran.");
  await expect(kartu.getByRole("button", { name: /terapkan/i })).toHaveCount(0);
});

test("AC-03: penghasilan kosong, rasio tidak dapat dihitung", async ({ page }) => {
  await page.goto("/cara-pakai");
  await tombol(page, "Lanjut").click();
  await tombol(page, "Lewati dulu").click();
  await isiCekDina(page);
  await expect(page.getByText("tidak dapat dihitung")).toBeVisible();
  await expect(page.getByText("Rp3.270.000").first()).toBeVisible();
});

test("AC-09, AC-10, AC-11: Putuskan, jadwal, catat bayar, pengingat berhenti", async ({ page }) => {
  await mulaiTamu(page);
  await page.goto("/cek");
  await tombol(page, "Pakai data contoh (Dina)").click();
  await tombol(page, "Hitung biaya sebenarnya").click();
  await page.goto("/cek/putuskan");

  // AC-09: dua tombol setara, tanpa tombol utama, tanpa tombol pengajuan
  const main = page.locator("main");
  const ambil = tombol(page, "Aku ambil pinjaman ini, catat di Pinjamanku");
  const tidak = tombol(page, "Aku tidak jadi meminjam");
  await expect(ambil).toHaveClass(/tombol-kedua/);
  await expect(tidak).toHaveClass(/tombol-kedua/);
  await expect(main.locator(".tombol-utama")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /ajukan|cairkan/i })).toHaveCount(0);

  // AC-10
  await ambil.click();
  await expect(page.getByText("Disalin dari hasil Cek")).toBeVisible();
  await page.getByLabel("Jatuh tempo pertama").fill("2026-10-12");
  for (const t of ["12 Oktober 2026", "12 November 2026", "12 Desember 2026"]) await expect(page.getByText(t)).toBeVisible();
  await tombol(page, "Simpan pinjaman").click();
  await expect(page).toHaveURL(/\/pinjamanku\/.+/);
  await expect(page.locator("main").getByText("Terjadwal", { exact: true })).toHaveCount(3);

  // Pengingat 14 hari ke depan sebelum dibayar: H-3, H-1, Hari H, H+1, H+3 untuk 12 Okt
  await page.goto("/saya/notifikasi");
  await expect(page.getByText(/jatuh tempo 3 hari lagi \(12 Okt\)/)).toBeVisible();
  await expect(page.getByText(/Rp1\.090\.000/)).toHaveCount(0); // AC-13: mode privasi tanpa jumlah

  // AC-11: tandai dibayar, pengingat berhenti
  await page.goto("/pinjamanku");
  await page.getByRole("link", { name: /Penawaran B/ }).first().click();
  await tombol(page, "Tandai dibayar").click();
  await page.getByRole("dialog").getByRole("button", { name: "Tandai sudah dibayar" }).click();
  await expect(page.locator("main").getByText("Dibayar", { exact: true })).toHaveCount(1);
  await page.goto("/saya/notifikasi");
  await expect(page.getByText(/12 Okt/)).toHaveCount(0);
});

test("AC-16 dan NFR-05: tanpa kata terlarang, tanpa gulir horizontal", async ({ page }, info) => {
  await mulaiTamu(page);
  // Nama yang sangat panjang tanpa spasi tidak boleh melebarkan halaman di ponsel
  await page.goto("/pinjamanku/tambah");
  await page.getByLabel("Nama pinjaman").fill("PinjamanDenganNamaYangSangatPanjangSekaliTanpaSpasi");
  await page.getByLabel("Cicilan per kali").fill("500000");
  await page.getByLabel("Jumlah cicilan").fill("2");
  await page.getByLabel("Jatuh tempo pertama").fill("2026-10-20");
  await tombol(page, "Simpan pinjaman").click();
  await page.goto("/cek");
  await tombol(page, "Pakai data contoh (Dina)").click();
  await tombol(page, "Hitung biaya sebenarnya").click();
  const rute = ["/pinjamanku", "/beranda", "/cek", "/cek/hasil", "/cek/penjelasan?tab=ubah", "/cek/bandingkan", "/cek/cicilan", "/cek/uji-paham", "/cek/putuskan", "/pinjamanku", "/jadwal", "/jadwal/ringkasan", "/saya", "/saya/pengingat", "/bantuan", "/cara-hitung", "/privasi"];
  for (const r of rute) {
    await page.goto(r);
    await page.locator("main").waitFor();
    const teks = (await page.locator("body").innerText()).toLowerCase();
    expect(teks, r).not.toMatch(/macet|galbay|menunggak/);
    if (info.project.name === "ponsel") {
      const [sw, cw, iw, vv] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, innerWidth, visualViewport?.width ?? innerWidth]);
      expect(sw, `gulir horizontal di ${r}`).toBeLessThanOrEqual(cw);
      // Di peramban ponsel, isi yang terlalu lebar memperbesar viewport tata letak (halaman mengecil)
      expect(iw, `halaman melebar melewati layar di ${r}`).toBeLessThanOrEqual(Math.ceil(vv));
    }
  }
});

test("S24: kontak bantuan nyata, tanpa nomor karangan", async ({ page }) => {
  await page.goto("/bantuan?dari=beranda");
  await page.getByRole("button", { name: /Kontak OJK 157/ }).click();
  await expect(page.locator('a[href="tel:157"]')).toBeVisible();
  await page.getByRole("button", { name: /Bicara tentang perasaanmu/ }).click();
  await expect(page.locator('a[href="tel:119"]')).toBeVisible();
  await page.goto("/bantuan?prioritas=1&dari=obrolan");
  await expect(page.getByRole("heading", { name: "Kamu tidak sendirian" })).toBeVisible();
  await expect(page.locator('a[href="tel:112"]')).toBeVisible();
});

test("ACC-01, ACC-04, AC-14: akun tanpa kata sandi, lalu hapus akun", async ({ page }, info) => {
  await page.goto("/cara-pakai");
  await page.getByRole("radio", { name: /Buat akun/ }).click();
  await tombol(page, "Lanjut").click();
  await page.getByLabel("Email").fill(`uji-${info.project.name}-${Date.now()}@contoh.id`);
  await tombol(page, "Kirim tautan masuk").click();
  await expect(page.getByText("Centang pernyataan usia 18 tahun ke atas")).toBeVisible(); // ACC-04
  await page.getByText("Aku berusia 18 tahun ke atas.").click();
  await tombol(page, "Kirim tautan masuk").click();
  const kode = (await page.getByText(/Mode pengembangan/).innerText()).match(/\d{6}/)![0];
  await page.getByLabel("Digit 1").fill(kode);
  await tombol(page, "Masuk dengan kode").click();
  await expect(page).toHaveURL(/\/profil-awal$/);
  await tombol(page, "Lewati dulu").click();
  await page.goto("/saya");
  await expect(page.getByText("Akun aktif")).toBeVisible();
  await tombol(page, "Hapus akun dan semua data").click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page).toHaveURL(/\/selamat-datang$/);
});

test("NFR-03: Cek tetap terbuka tanpa jaringan setelah pemuatan pertama", async ({ page, context }) => {
  await page.goto("/cek");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // halaman kini dikendalikan Service Worker
  await page.evaluate(() => new Promise((r) => (navigator.serviceWorker.controller ? r(true) : navigator.serviceWorker.addEventListener("controllerchange", () => r(true)))));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Nilai pinjaman")).toBeVisible();
  await page.getByLabel("Nilai pinjaman").fill("3000000");
  await page.getByLabel("Tenor").fill("90");
  await page.getByLabel("Bunga", { exact: true }).fill("0,1");
  await page.getByLabel("Biaya admin").fill("2");
  await tombol(page, "Hitung biaya sebenarnya").click();
  await expect(page.getByRole("heading", { name: /membayar Rp3\.270\.000/ })).toBeVisible();
  await context.setOffline(false);
});

test("AC-17: parameter butuh dua orang (panel admin)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Panel admin untuk desktop");
  const masuk = async (token: string) => {
    await page.goto("/admin");
    await page.getByLabel("Token admin").fill(token);
    await tombol(page, "Masuk").click();
  };
  await masuk("contoh-penyunting");
  await page.getByRole("link", { name: "Parameter" }).click();
  await expect(page.getByText("Ini usulanmu, jadi tombol persetujuan nonaktif.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Setujui dan terbitkan" })).toHaveCount(0);
  await tombol(page, "Keluar").click();

  await masuk("contoh-peninjau");
  await page.getByRole("link", { name: "Parameter" }).click();
  await tombol(page, "Setujui dan terbitkan").click();
  await expect(page.getByText(/2026\.11\.1 · Perubahan batas tenor/).locator("..").locator("..")).toContainText("Terbit");
});
