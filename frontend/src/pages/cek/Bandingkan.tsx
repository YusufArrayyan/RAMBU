/** S11 Bandingkan (CEK-09, XAI-03): penawaran pada pinjaman dan tenor yang sama, kontrastif selisih biaya. */
import { CircleCheck, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { IsianAngka, IsianTeks } from "@/components/Isian";
import { Lembar } from "@/components/Lembar";
import { Halaman } from "@/components/Shell";
import { Kartu, Lencana, Tombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { kontrastifPenawaran } from "@/lib/engine";
import { angka, persen, rupiah } from "@/lib/format";
import { MAKS_PENAWARAN, biayaTerendah, useAlur, type PenawaranDihitung } from "@/state/flow";

function LembarUbah({ p, onTutup }: { p: PenawaranDihitung | null; onTutup: () => void }) {
  const { ubahPenawaran, hapusPenawaran, alur, ubah } = useAlur();
  const [nama, setNama] = useState("");
  const [bunga, setBunga] = useState<number | null>(null);
  const [admin, setAdmin] = useState<number | null>(null);
  useEffect(() => {
    if (!p) return;
    setNama(p.nama);
    setBunga(p.bungaHarianPersen);
    setAdmin(p.adminPersen);
  }, [p]);
  return (
    <Lembar
      buka={!!p}
      onTutup={onTutup}
      judul="Ubah penawaran"
      kaki={
        <div className="flex gap-2">
          {p && alur.penawaran.length > 1 && (
            <Tombol
              varian="hapus"
              ikon={Trash2}
              onClick={() => {
                hapusPenawaran(p.id);
                onTutup();
              }}
            >
              Hapus
            </Tombol>
          )}
          <Tombol
            blok
            onClick={() => {
              if (p) {
                ubahPenawaran(p.id, { nama: nama.trim() || p.nama, bungaHarianPersen: bunga, adminPersen: admin });
                // penawaran pertama juga tampil di Isi penawaran: jaga bunga tertulisnya tetap sama
                if (p.id === alur.penawaran[0].id) ubah({ bungaTertulis: bunga, satuanBunga: "hari" });
              }
              onTutup();
            }}
          >
            Simpan
          </Tombol>
        </div>
      }
    >
      <div className="space-y-4">
        <IsianTeks label="Nama penawaran" name="nama" nilai={nama} onNilai={setNama} maxLength={30} petunjuk="Nama bebas. Nama penyelenggara tidak wajib." />
        <IsianAngka label="Bunga" name="bunga" jenis="desimal" satuan="% per hari" nilai={bunga} onNilai={setBunga} maxDesimal={4} />
        <IsianAngka label="Biaya admin" name="admin" jenis="desimal" satuan="% dari pinjaman" nilai={admin} onNilai={setAdmin} maxDesimal={2} />
      </div>
    </Lembar>
  );
}

export default function Bandingkan() {
  const { alur, dihitung, tambahPenawaran, ubah, cicilanLain } = useAlur();
  const nav = useNavigate();
  const [ubahId, setUbahId] = useState<string | null>(null);
  const terendah = biayaTerendah(dihitung);
  useEffect(() => {
    if (dihitung.length > 1) catat("compare_used", { jumlah: dihitung.length }, true);
  }, [dihitung.length]);
  if (!alur.pokok || !alur.tenor) return <Navigate to="/cek" replace />;

  const valid = dihitung.filter((p) => p.hasil);
  const urut = [...valid].sort((a, b) => a.hasil!.biaya - b.hasil!.biaya);
  const kontras = urut.length >= 2 ? { murah: urut[0], mahal: urut[1], k: kontrastifPenawaran(urut[0].hasil!, urut[1].hasil!) } : null;
  const terpilih = dihitung.find((p) => p.id === alur.terpilih) ?? dihitung[0];
  const semuaDiAtas = valid.length > 0 && valid.every((p) => p.hasil!.diAtasPatokan);
  const patokan = valid[0]?.hasil?.patokanPersen ?? 30;

  const baris: { label: string; nilai: (p: PenawaranDihitung) => string; tebal?: boolean; nada?: (p: PenawaranDihitung) => boolean }[] = [
    { label: "Bunga per hari", nilai: (p) => (p.bungaHarianPersen == null ? "-" : persen(p.bungaHarianPersen, 3)) },
    { label: "Admin", nilai: (p) => (p.adminPersen == null ? "-" : persen(p.adminPersen, 2)) },
    { label: "Diterima (Rp)", nilai: (p) => (p.hasil ? angka(p.hasil.diterima) : "-") },
    { label: "Total (Rp)", nilai: (p) => (p.hasil ? angka(p.hasil.total) : "-"), tebal: true },
    { label: "Biaya (Rp)", nilai: (p) => (p.hasil ? angka(p.hasil.biaya) : "-") },
    { label: "Cicilan (Rp)", nilai: (p) => (p.hasil ? angka(p.hasil.cicilan) : "-") },
    { label: "Rasio*", nilai: (p) => (p.hasil?.rasioPersen != null ? persen(p.hasil.rasioPersen) : "-"), nada: (p) => !!p.hasil?.diAtasPatokan },
    { label: "Efektif per hari", nilai: (p) => (p.hasil ? persen(p.hasil.efektifHarianPersen, 2) : "-"), nada: (p) => !!p.hasil && ["atas_batas", "atas_bunga", "atas_jika_admin"].includes(p.hasil.statusBatas) },
  ];

  return (
    <Halaman
      judul="Bandingkan"
      kembali="/cek/hasil"
      lebar="lebar"
      kanan={
        dihitung.length < MAKS_PENAWARAN && (
          <button type="button" onClick={tambahPenawaran} aria-label="Tambah penawaran" className="-mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-sunken">
            <Plus aria-hidden className="size-6" />
          </button>
        )
      }
      aksi={
        <Tombol blok disabled={!terpilih.hasil} onClick={() => nav("/cek/cicilan")}>
          Pilih {terpilih.nama} dan lanjut
        </Tombol>
      }
    >
      <Kartu>
        <p className="label-kartu">Sama untuk {dihitung.length > 1 ? "semua penawaran" : "penawaran ini"}</p>
        <p className="angka mt-1 text-[1.0625rem] font-bold text-ink">
          {rupiah(alur.pokok)} · {alur.tenor} hari · cicilan lain {rupiah(cicilanLain)}
        </p>
      </Kartu>

      <Kartu className="mt-4 overflow-x-auto p-0 lg:p-0">
        <table className="w-full border-collapse text-[0.9375rem]">
          <caption className="sr-only">Perbandingan penawaran. Pilih satu untuk dilanjutkan.</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[24%] px-2 pt-4 pb-2 text-left align-bottom text-sm font-semibold text-muted sm:px-4">
                <span className="sr-only">Besaran</span>
              </th>
              {dihitung.map((p) => {
                const melebihi = p.hasil && ["atas_batas", "atas_bunga", "atas_jika_admin"].includes(p.hasil.statusBatas);
                return (
                  <th key={p.id} scope="col" className={cx("px-2 pt-4 pb-2 text-center align-bottom", p.id === alur.terpilih && "bg-tint")}>
                    <span className="flex items-center justify-center gap-0.5">
                      <span className="truncate text-base font-bold text-ink">{p.nama}</span>
                      <button type="button" onClick={() => setUbahId(p.id)} aria-label={`Ubah ${p.nama}`} className="grid size-11 shrink-0 place-items-center rounded-full text-teal hover:bg-sunken">
                        <Pencil aria-hidden className="size-4" />
                      </button>
                    </span>
                    <span className="mt-1 flex min-h-8 flex-wrap justify-center gap-1">
                      {melebihi && (
                        <Lencana kecil nada="amber" ikon={TriangleAlert} className="[&>svg]:hidden sm:[&>svg]:block">
                          Melebihi
                        </Lencana>
                      )}
                      {terendah.has(p.id) && (
                        <Lencana kecil nada="teal" ikon={CircleCheck} className="[&>svg]:hidden sm:[&>svg]:block">
                          Terendah
                        </Lencana>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.label} className="border-t border-line">
                <th scope="row" className="px-2 py-3 text-left text-[13px] leading-tight font-medium text-text2 sm:px-4 sm:text-sm">
                  {b.label}
                </th>
                {dihitung.map((p) => (
                  <td key={p.id} className={cx("angka px-1 py-3 text-center text-[0.875rem] sm:px-2 sm:text-[0.9375rem]", b.tebal ? "font-bold text-ink" : "font-medium text-ink", b.nada?.(p) && "font-bold text-amber", p.id === alur.terpilih && "bg-tint")}>
                    {b.nilai(p)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th scope="row" className="px-2 py-3 text-left text-[13px] leading-tight font-medium text-text2 sm:px-4 sm:text-sm">
                Lanjut dengan
              </th>
              {dihitung.map((p) => (
                <td key={p.id} className={cx("px-2 py-2 text-center", p.id === alur.terpilih && "bg-tint")}>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-teal-d">
                    <input type="radio" name="terpilih" checked={p.id === alur.terpilih} onChange={() => ubah({ terpilih: p.id })} className="size-5 accent-[var(--teal)]" disabled={!p.hasil} />
                    <span className="sr-only sm:not-sr-only">Pilih</span>
                    <span className="sr-only">{p.nama}</span>
                  </label>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Kartu>

      <p className="mt-3 text-sm text-muted">
        *Bersama cicilan lain.{semuaDiAtas ? ` Di atas patokan ${patokan}% pada ${dihitung.length > 2 ? "ketiganya" : dihitung.length === 2 ? "keduanya" : "penawaran ini"}.` : ""} “Melebihi” berarti perkiraan di atas batas harian OJK untuk segmen ini; bukan penilaian bahwa
        penyelenggara melanggar.
      </p>

      {kontras && kontras.k.selisihBiaya > 0.5 && (
        <Kartu varian="tint" className="mt-4 max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <h2 className="t-h2">
              Kenapa {kontras.murah.nama} lebih murah dari {kontras.mahal.nama}?
            </h2>
            <span className="shrink-0 text-sm font-bold text-teal-d">Kontrastif</span>
          </div>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink">
            Selisih biaya <strong className="angka">{rupiah(kontras.k.selisihBiaya)}</strong>: bunga {rupiah(kontras.k.selisihBunga)} dan admin {rupiah(kontras.k.selisihAdmin)}.
          </p>
        </Kartu>
      )}

      {dihitung.length === 1 && (
        <Kartu varian="catatan" className="mt-4">
          <p className="text-text2">Dapat penawaran lain untuk jumlah dan tenor yang sama? Tambahkan sampai tiga penawaran untuk dibandingkan.</p>
          <Tombol varian="kedua" ikon={Plus} className="mt-3" onClick={tambahPenawaran}>
            Tambah penawaran
          </Tombol>
        </Kartu>
      )}
      {dihitung.length > 1 && <p className="mt-4 text-sm text-muted">Ubah bunga dan admin tiap penawaran dengan ikon pensil di kepala kolom. Hasil dihitung ulang seketika.</p>}

      <LembarUbah p={dihitung.find((p) => p.id === ubahId) ?? null} onTutup={() => setUbahId(null)} />
    </Halaman>
  );
}
