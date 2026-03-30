"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PaymentState = "success" | "failure" | "pending" | null;

const MESSAGES: Record<NonNullable<PaymentState>, { icon: string; title: string; body: string; color: string }> = {
  success: {
    icon:  "check_circle",
    title: "¡PAGO EXITOSO!",
    body:  "Tu inscripción fue confirmada. Recibirás información del curso en tu correo.",
    color: "border-primary-container bg-primary-container/10",
  },
  failure: {
    icon:  "cancel",
    title: "PAGO RECHAZADO",
    body:  "El pago no pudo procesarse. Puedes intentarlo nuevamente.",
    color: "border-error bg-error/10",
  },
  pending: {
    icon:  "hourglass_top",
    title: "PAGO EN PROCESO",
    body:  "Tu pago está siendo verificado. Te notificaremos cuando se confirme.",
    color: "border-tertiary bg-tertiary/10",
  },
};

export function PaymentFeedback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<PaymentState>(null);

  useEffect(() => {
    const payment = searchParams.get("payment") as PaymentState;
    if (payment && payment in MESSAGES) {
      setState(payment);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  if (!state) return null;

  const { icon, title, body, color } = MESSAGES[state];

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-auto px-4`}>
      <div className={`border-l-4 ${color} bg-surface-container p-5 flex items-start gap-4 neo-shadow`}>
        <span className={`material-symbols-outlined text-2xl flex-shrink-0 ${state === "success" ? "text-primary-container" : state === "failure" ? "text-error" : "text-tertiary"}`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-black text-sm uppercase tracking-tighter text-on-background">{title}</p>
          <p className="font-body text-xs text-on-surface-variant mt-1">{body}</p>
        </div>
        <button
          onClick={() => setState(null)}
          className="flex-shrink-0 text-outline hover:text-on-surface transition-colors"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
