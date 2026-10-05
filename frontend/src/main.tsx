import { StrictMode, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import "./index.css";
import { Halaman, KerangkaPeminjam, type PeganganRute } from "@/components/Shell";
import { TautanTombol } from "@/components/ui";
import { ToastProvider } from "@/components/Toast";
import { AppProvider, useApp } from "@/state/app";
import { KonfigProvider } from "@/state/config";
import { AlurProvider } from "@/state/flow";
import Beranda from "@/pages/Beranda";
import IsiPenawaran from "@/pages/cek/IsiPenawaran";
import BiayaSebenarnya from "@/pages/cek/BiayaSebenarnya";
import Selamat from "@/pages/onboarding/Selamat";

const CaraPakai = lazy(() => import("@/pages/onboarding/CaraPakai"));
const Masuk = lazy(() => import("@/pages/onboarding/Masuk"));
const ProfilAwal = lazy(() => import("@/pages/onboarding/ProfilAwal"));
const Penjelasan = lazy(() => import("@/pages/cek/Penjelasan"));
const Klausul = lazy(() => import("@/pages/cek/Klausul"));
const Bandingkan = lazy(() => import("@/pages/cek/Bandingkan"));
const SemuaCicilan = lazy(() => import("@/pages/cek/SemuaCicilan"));
const Obrolan = lazy(() => import("@/pages/cek/Obrolan"));
const UjiPaham = lazy(() => import("@/pages/cek/UjiPaham"));
const Putuskan = lazy(() => import("@/pages/cek/Putuskan"));
const DaftarPinjaman = lazy(() => import("@/pages/pinjaman/Daftar"));
const TambahPinjaman = lazy(() => import("@/pages/pinjaman/Tambah"));
const DetailPinjaman = lazy(() => import("@/pages/pinjaman/Detail"));
const Kalender = lazy(() => import("@/pages/jadwal/Kalender"));
const Ringkasan = lazy(() => import("@/pages/jadwal/Ringkasan"));
const Saya = lazy(() => import("@/pages/saya/Saya"));
const Pengingat = lazy(() => import("@/pages/saya/Pengingat"));
const Notifikasi = lazy(() => import("@/pages/saya/Notifikasi"));
const Bantuan = lazy(() => import("@/pages/saya/Bantuan"));
const CaraHitung = lazy(() => import("@/pages/saya/CaraHitung"));
const Privasi = lazy(() => import("@/pages/saya/Privasi"));
const Desain = lazy(() => import("@/pages/Desain"));
const Admin = lazy(() => import("@/pages/admin/Admin"));

const muat = (el: ReactNode) => <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>{el}</Suspense>;
const tab: PeganganRute = { tab: true };
const polos: PeganganRute = { polos: true };

function Akar() {
  const { data } = useApp();
  return <Navigate to={data.mode ? "/beranda" : "/selamat-datang"} replace />;
}

function TidakDitemukan() {
  return (
    <Halaman judul="Halaman tidak ditemukan" kembali="/beranda" lebar="sempit">
      <p className="text-text2">Alamat ini tidak ada. Kembali ke Beranda untuk melanjutkan.</p>
      <TautanTombol to="/beranda" className="mt-6">
        Ke Beranda
      </TautanTombol>
    </Halaman>
  );
}

const router = createBrowserRouter([
  { path: "/admin/*", element: muat(<Admin />) },
  {
    element: <KerangkaPeminjam />,
    children: [
      { path: "/", element: <Akar />, handle: polos },
      { path: "/selamat-datang", element: <Selamat />, handle: polos },
      { path: "/cara-pakai", element: muat(<CaraPakai />), handle: polos },
      { path: "/masuk", element: muat(<Masuk />), handle: polos },
      { path: "/profil-awal", element: muat(<ProfilAwal />), handle: polos },

      { path: "/beranda", element: <Beranda />, handle: tab },

      { path: "/cek", element: <IsiPenawaran /> },
      { path: "/cek/hasil", element: <BiayaSebenarnya /> },
      { path: "/cek/penjelasan", element: muat(<Penjelasan />) },
      { path: "/cek/klausul", element: muat(<Klausul />) },
      { path: "/cek/bandingkan", element: muat(<Bandingkan />) },
      { path: "/cek/cicilan", element: muat(<SemuaCicilan />) },
      { path: "/cek/obrolan", element: muat(<Obrolan />) },
      { path: "/cek/uji-paham", element: muat(<UjiPaham />) },
      { path: "/cek/putuskan", element: muat(<Putuskan />) },

      { path: "/pinjamanku", element: muat(<DaftarPinjaman />), handle: tab },
      { path: "/pinjamanku/tambah", element: muat(<TambahPinjaman />) },
      { path: "/pinjamanku/:id", element: muat(<DetailPinjaman />) },

      { path: "/jadwal", element: muat(<Kalender />), handle: tab },
      { path: "/jadwal/ringkasan", element: muat(<Ringkasan />), handle: tab },

      { path: "/saya", element: muat(<Saya />), handle: tab },
      { path: "/saya/profil", element: muat(<ProfilAwal dariSaya />) },
      { path: "/saya/pengingat", element: muat(<Pengingat />) },
      { path: "/saya/notifikasi", element: muat(<Notifikasi />) },

      { path: "/bantuan", element: muat(<Bantuan />) },
      { path: "/cara-hitung", element: muat(<CaraHitung />) },
      { path: "/privasi", element: muat(<Privasi />) },
      { path: "/desain", element: muat(<Desain />) },
      { path: "*", element: <TidakDitemukan /> },
    ],
  },
]);

// PWA offline (NFR-03). Hanya build produksi, agar pengembangan tidak terganggu cache.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KonfigProvider>
      <AppProvider>
        <AlurProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AlurProvider>
      </AppProvider>
    </KonfigProvider>
  </StrictMode>,
);
