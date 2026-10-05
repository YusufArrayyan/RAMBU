import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const Ctx = createContext<(pesan: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<{ id: number; pesan: string }[]>([]);
  const tampil = useCallback((pesan: string) => {
    const id = Date.now() + Math.random();
    setDaftar((d) => [...d.slice(-2), { id, pesan }]);
    setTimeout(() => setDaftar((d) => d.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={tampil}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {daftar.map((t) => (
          <div key={t.id} className="muncul pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-[0.9375rem] font-medium text-canvas shadow-[var(--shadow-sheet)]">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
            {t.pesan}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
