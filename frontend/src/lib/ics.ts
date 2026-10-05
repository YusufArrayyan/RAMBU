/** Ekspor jadwal ke berkas kalender .ics (JDW-03, ING-06). Acara sepanjang hari pada tanggal jatuh tempo. */
import { rupiah } from "./format";
import { infoPinjaman, sudahDibayar, tambahHari, type Pinjaman } from "./jadwal";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const tgl = (iso: string) => iso.replace(/-/g, "");

export function buatIcs(daftar: Pinjaman[], opsi: { privasi: boolean; offsetsAlarm?: number[] }): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const baris = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RAMBU//Jadwal cicilan//ID", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Cicilan (RAMBU)"];
  for (const p of daftar) {
    for (const c of infoPinjaman(p).cicilan) {
      if (sudahDibayar(c.status)) continue;
      const judul = opsi.privasi ? `Cicilan jatuh tempo (${p.nama})` : `Cicilan ${p.nama} ${rupiah(c.sisa)}`;
      baris.push(
        "BEGIN:VEVENT",
        `UID:${c.cicilan.id}@rambu`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${tgl(c.cicilan.jatuhTempo)}`,
        `DTEND;VALUE=DATE:${tgl(tambahHari(c.cicilan.jatuhTempo, 1))}`,
        `SUMMARY:${esc(judul)}`,
        `DESCRIPTION:${esc(`Cicilan ke-${c.cicilan.ke} dari ${p.cicilan.length}. Catatanmu di RAMBU, bukan data penyelenggara. Cocokkan dengan aplikasi pinjamanmu.`)}`,
      );
      for (const off of opsi.offsetsAlarm ?? [-3, -1]) {
        if (off >= 0) continue;
        baris.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(judul)}`, `TRIGGER:-P${Math.abs(off)}D`, "END:VALARM");
      }
      baris.push("END:VEVENT");
    }
  }
  baris.push("END:VCALENDAR");
  return baris.join("\r\n");
}

export function unduhIcs(isi: string, nama = "jadwal-cicilan-rambu.ics") {
  const url = URL.createObjectURL(new Blob([isi], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
