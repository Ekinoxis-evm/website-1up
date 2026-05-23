"use client";

// Shared admin toast — replaces ad-hoc `alert()` + silent-fail patterns across
// the admin clients. Same design system as the rest of the admin panel:
// sharp corners (Rule 1), background-shifted (Rule 2), Spanish copy.
//
// Usage in any "use client" admin component under /admin/(protected):
//
//   const { showError, showSuccess } = useAdminToast();
//   ...
//   if (!res.ok) { showError("No se pudo guardar."); return; }
//   showSuccess("Guardado.");

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "error" | "success" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

interface ToastContextValue {
  showError:   (msg: string) => void;
  showSuccess: (msg: string) => void;
  showInfo:    (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function useAdminToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAdminToast must be used inside <AdminToastProvider>");
  return ctx;
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, kind, message }]);
  }, []);

  const showError   = useCallback((m: string) => push("error",   m), [push]);
  const showSuccess = useCallback((m: string) => push("success", m), [push]);
  const showInfo    = useCallback((m: string) => push("info",    m), [push]);

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </ToastContext.Provider>
  );
}

const KIND_BG: Record<ToastKind, string> = {
  error:   "bg-error text-white",
  success: "bg-secondary text-white",
  info:    "bg-surface-container-highest text-on-surface",
};

const KIND_ICON: Record<ToastKind, string> = {
  error:   "error",
  success: "check_circle",
  info:    "info",
};

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const handle = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(handle);
  }, [onDismiss]);

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto flex items-start gap-2 px-4 py-3 ${KIND_BG[toast.kind]} animate-in fade-in slide-in-from-right-4 duration-200`}
    >
      <span
        className="material-symbols-outlined text-base shrink-0 mt-0.5"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {KIND_ICON[toast.kind]}
      </span>
      <p className="font-body text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        className="text-current opacity-70 hover:opacity-100 transition-opacity shrink-0"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
