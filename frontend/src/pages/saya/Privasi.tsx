/** Ringkasan privasi (ONB-04, PRD 14). Tampil sebelum membuat akun dan sebelum memakai AI. */
import { Halaman } from "@/components/Shell";
import { Kartu } from "@/components/ui";

const BARIS: [string, string, string][] = [
  ["Angka di Cek", "Di perangkat, hilang saat tab ditutup", "Sama"],
  ["Penghasilan dan tanggal gajian", "Di perangkat", "Di perangkat dan server bila kamu mengisi"],
  ["Pinjaman, jadwal, catatan bayar", "Di perangkat", "Di perangkat dan cadangan di server"],
  ["Pengaturan pengingat, email", "-", "Server"],
  ["Teks dokumen, gambar, pesan obrolan", "Dikirim ke layanan AI hanya setelah klik; tidak disimpan RAMBU", "Sama"],
  ["Statistik anonim", "Nama peristiwa saja, id sesi acak", "Sama"],
];

export default function Privasi() {
  return (
    <Halaman judul="Ringkasan privasi" kembali={true}>
      <div className="prosa space-y-4">
        <p className="text-[1.0625rem] text-text2">RAMBU memakai data seminimal mungkin. Mode tamu tidak mengirim data keuanganmu ke server mana pun. Akun hanya menyimpan yang dibutuhkan untuk pengingat dan cadangan.</p>
      </div>
      {/* Ponsel: daftar bertumpuk; layar lebih lebar: tabel */}
      <ul className="mt-5 space-y-3 sm:hidden">
        {BARIS.map(([d, t, a]) => (
          <Kartu as="li" key={d} className="p-4">
            <p className="font-semibold text-ink">{d}</p>
            <dl className="mt-2 space-y-1.5 text-[0.9375rem]">
              <div>
                <dt className="text-sm font-semibold text-muted">Mode tamu</dt>
                <dd className="text-text2">{t}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-muted">Mode akun</dt>
                <dd className="text-text2">{a}</dd>
              </div>
            </dl>
          </Kartu>
        ))}
      </ul>
      <Kartu className="mt-5 hidden overflow-x-auto p-0 sm:block lg:p-0" tabIndex={0} aria-label="Tabel penyimpanan data">
        <table className="w-full min-w-[34rem] text-[0.9375rem]">
          <caption className="sr-only">Data apa yang disimpan di mana</caption>
          <thead>
            <tr className="text-left text-sm text-muted">
              <th scope="col" className="px-5 py-3 font-semibold">
                Data
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Mode tamu
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Mode akun
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {BARIS.map(([d, t, a]) => (
              <tr key={d}>
                <th scope="row" className="px-5 py-3 text-left font-semibold text-ink">
                  {d}
                </th>
                <td className="px-3 py-3 text-text2">{t}</td>
                <td className="px-3 py-3 text-text2">{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Kartu>
      <div className="prosa mt-6 space-y-3 text-text2">
        <h2 className="t-h2">Yang tidak pernah dilakukan RAMBU</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Mengirim datamu ke penyelenggara pinjaman. Penyelenggara bukan pengguna RAMBU dan tidak menerima data.</li>
          <li>Menghubungi keluarga, atasan, atau kontakmu, atau menagih.</li>
          <li>Memproses pembayaran atau terhubung ke rekening.</li>
          <li>Memakai pelacak pihak ketiga atau iklan.</li>
        </ul>
        <h2 className="t-h2 pt-2">Hakmu</h2>
        <p>Kamu bisa mengekspor data (JSON dan CSV) dan menghapus akun beserta seluruh data server kapan saja dari halaman Saya. Pengguna minimal berusia 18 tahun (aturan produk RAMBU).</p>
        <p className="text-sm text-muted">Acuan: UU 27/2022 tentang Pelindungan Data Pribadi. Rujukan pasal dan tenggat penghapusan masih menunggu tinjauan penasihat hukum.</p>
      </div>
    </Halaman>
  );
}
