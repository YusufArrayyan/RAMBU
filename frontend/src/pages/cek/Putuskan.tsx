/**
 * S15 Putuskan (KPT-01 s.d. KPT-04). Dua tombol berbobot setara, tanpa tombol utama dan tanpa
 * tombol pengajuan (AC-09). Pernyataan dijawab untuk diri sendiri dan tidak mengunci apa pun.
 */
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Halaman } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import { Kartu, KotakCentang, Tombol, cx } from "@/components/ui";
import { catat } from "@/lib/analytics";
import { persen, rupiah } from "@/lib/format";
import { jumlahTepat, nilai } from "@/lib/ujiPaham";
import { useAlur } from "@/state/flow";

export default function Putuskan() {
  const { utama, alur, mulaiUlang } = useAlur();
  const nav = useNavigate();
  const toast = useToast();
  const [jawab, setJawab] = useState([false, false, false]);
  const h = utama.hasil;
  if (!h) return <Navigate to="/cek" replace />;
  const uji = alur.ujiPaham ? jumlahTepat(nilai(alur.ujiPaham, h)) : null;
  const ringkas = [
    alur.klausul.length ? `${alur.klausul.length} klausul perlu dibaca` : "klausul belum dibaca dari dokumen",
    uji === null ? "uji paham dilewati" : `uji paham ${uji} dari 3 angka dekat`,
  ].join(" · ");
  const pernyataan = [`Aku sudah membaca total yang harus kubayar: ${rupiah(h.total)}.`, "Cicilannya muat tanpa mengorbankan kebutuhan pokokku.", "Aku tahu akibatnya kalau telat bayar."];

  return (
    <Halaman judul="Putuskan" kembali="/cek/uji-paham" langkah={{ ke: 4, dari: 4 }} lebar="sempit">
      <Kartu>
        <p className="label-kartu">{utama.nama}</p>
        <dl className="mt-2 space-y-1.5">
          {[
            ["Diterima", rupiah(h.diterima)],
            ["Total bayar", rupiah(h.total)],
            ["Cicilan", `${h.jumlahCicilan} × ${rupiah(h.cicilan)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-text2">{k}</dt>
              <dd className="angka text-[1.0625rem] font-bold text-ink">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3">
            <dt className="text-text2">Rasio bersama cicilan lain</dt>
            <dd className={cx("angka text-[1.0625rem] font-bold", h.diAtasPatokan ? "text-amber" : "text-ink")}>
              {h.rasioPersen === null ? "tidak dapat dihitung" : `${persen(h.rasioPersen)}${h.diAtasPatokan ? " (di atas patokan)" : ""}`}
            </dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">{ringkas}</p>
      </Kartu>

      <fieldset className="mt-6">
        <legend className="t-h2 mb-2">Jawab untuk dirimu sendiri</legend>
        {pernyataan.map((p, i) => (
          <KotakCentang key={i} checked={jawab[i]} onChange={(v) => setJawab((j) => j.map((x, k) => (k === i ? v : x)))}>
            {p}
          </KotakCentang>
        ))}
      </fieldset>

      <Kartu varian="catatan" className="mt-5 p-4 lg:p-5">
        <p className="text-text2">RAMBU tidak menyuruh kamu meminjam atau tidak meminjam, dan tidak mengajukan pinjaman. Keputusan ada padamu.</p>
      </Kartu>

      <div className="mt-8 space-y-3">
        <Tombol
          blok
          varian="kedua"
          onClick={() => {
            catat("decision_made", { pilihan: "ambil" });
            nav("/pinjamanku/tambah?dari=cek");
          }}
        >
          Aku ambil pinjaman ini, catat di Pinjamanku
        </Tombol>
        <Tombol
          blok
          varian="kedua"
          onClick={() => {
            catat("decision_made", { pilihan: "tidak_jadi" });
            mulaiUlang();
            toast("Tidak ada yang dicatat. Angka Cek tadi sudah dihapus dari perangkat.");
            nav("/beranda");
          }}
        >
          Aku tidak jadi meminjam
        </Tombol>
        <Tombol
          blok
          varian="teks"
          onClick={() => {
            catat("decision_made", { pilihan: "ubah" });
            nav("/cek");
          }}
        >
          Ubah angka
        </Tombol>
      </div>
    </Halaman>
  );
}
