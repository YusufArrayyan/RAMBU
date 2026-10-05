/**
 * Deteksi kalimat yang menyiratkan keinginan menyakiti diri (CIC-04, PRD 7.9).
 * Daftar kata dan ambang final disusun bersama klinisi (PERLU DATA). Daftar sementara ini
 * sengaja gagal-aman: lebih baik menampilkan bantuan berlebih daripada terlewat (13.3).
 * Pemeriksaan berjalan di perangkat sebelum pesan dikirim ke layanan AI, dan diulang di server.
 */
const POLA: RegExp[] = [
  /bunuh\s*diri/i,
  /akhir(i|in)\s*(hidup|nyawa)/i,
  /mengakhiri\s*(hidup|nyawa)/i,
  /(ingin|pengen|pingin|mau|lebih\s*baik)\s*(aku\s*|saya\s*|gw\s*|gue\s*)?mati/i,
  /(tidak|nggak|ngga|gak|ga|enggak)\s*(ingin|mau|pengen|kuat)\s*(hidup|lagi\s*hidup)/i,
  /(menyakiti|melukai|nyakitin|lukai)\s*diri/i,
  /(gantung|minum\s*racun|loncat\s*dari)/i,
  /hidup\s*(ini\s*)?(tidak|nggak|gak|ga)\s*(ada\s*)?(guna|artinya|berarti)/i,
  /\b(suicide|kill\s*myself|end\s*my\s*life)\b/i,
];

export function menyiratkanMenyakitiDiri(teks: string): boolean {
  const t = teks.normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ");
  return POLA.some((p) => p.test(t));
}
