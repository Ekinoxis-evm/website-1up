"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

export type AliadoCard = {
  id: number;
  name: string;
  logoUrl: string | null;
  isComfenalco: boolean;
  hasPendingApi: boolean;
  discounts: Array<{ pct: number; appliesTo: string }>;
};

interface UserProfile {
  tipo_documento: string | null;
  numero_documento: string | null;
  comfenalco_afiliado: boolean | null;
  comfenalco_verified_at: string | null;
  verified_aliados: number[] | null;
}

const APPLIES_TO_LABEL: Record<string, string> = {
  courses: "en cursos",
  pass: "en 1UP Pass",
  all: "en cursos y Pass",
};

type VerifyState = "idle" | "loading" | "success" | "error" | "pending";

type Props = { aliados: AliadoCard[] };

export function BeneficiosTab({ aliados }: Props) {
  const { getAccessToken } = usePrivy();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [verifyState, setVerifyState] = useState<Record<number, VerifyState>>({});
  const [verifyMessage, setVerifyMessage] = useState<Record<number, string>>({});

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/user/profile", { headers: await authHeaders() });
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoadingProfile(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  function isVerified(aliado: AliadoCard): boolean {
    if (!profile) return false;
    if (aliado.isComfenalco) return profile.comfenalco_afiliado === true;
    return (profile.verified_aliados ?? []).includes(aliado.id);
  }

  function verifiedAt(aliado: AliadoCard): string | null {
    if (!profile) return null;
    if (aliado.isComfenalco) return profile.comfenalco_verified_at ?? null;
    return null;
  }

  async function handleVerify(aliado: AliadoCard) {
    if (!profile?.numero_documento) return;

    setVerifyState((s) => ({ ...s, [aliado.id]: "loading" }));
    setVerifyMessage((s) => ({ ...s, [aliado.id]: "" }));

    try {
      const headers = await authHeaders();
      let res: Response;

      if (aliado.isComfenalco) {
        res = await fetch("/api/user/comfenalco/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            tipoDocumento: profile.tipo_documento ?? "CC",
            numeroDocumento: profile.numero_documento,
          }),
        });
      } else {
        res = await fetch("/api/user/aliado/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            aliado_id: aliado.id,
            numero_documento: profile.numero_documento,
          }),
        });
      }

      const data = await res.json();

      if (res.status === 503) {
        setVerifyState((s) => ({ ...s, [aliado.id]: "pending" }));
        setVerifyMessage((s) => ({ ...s, [aliado.id]: data.error ?? "Integración pendiente." }));
        return;
      }

      if (!res.ok) {
        setVerifyState((s) => ({ ...s, [aliado.id]: "error" }));
        setVerifyMessage((s) => ({ ...s, [aliado.id]: data.error ?? "Error al verificar." }));
        return;
      }

      // Update profile state locally
      if (aliado.isComfenalco) {
        setProfile((p) => p ? {
          ...p,
          comfenalco_afiliado: data.isAffiliated ?? data.afiliado,
          comfenalco_verified_at: new Date().toISOString(),
        } : p);
        setVerifyMessage((s) => ({ ...s, [aliado.id]: data.message ?? (data.afiliado ? "¡Afiliación confirmada!" : "No se encontró afiliación.") }));
      } else {
        if (data.afiliado) {
          setProfile((p) => p ? {
            ...p,
            verified_aliados: [...(p.verified_aliados ?? []), aliado.id],
          } : p);
          setVerifyMessage((s) => ({ ...s, [aliado.id]: `¡Afiliación con ${aliado.name} confirmada!` }));
        } else {
          setVerifyMessage((s) => ({ ...s, [aliado.id]: `No se encontró afiliación con ${aliado.name}.` }));
        }
      }

      setVerifyState((s) => ({ ...s, [aliado.id]: "success" }));
    } catch {
      setVerifyState((s) => ({ ...s, [aliado.id]: "error" }));
      setVerifyMessage((s) => ({ ...s, [aliado.id]: "Error de red. Intenta nuevamente." }));
    }
  }

  const hasDoc = !!profile?.numero_documento;

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          BENEFICIOS
        </h1>
        <div className="h-0.5 w-12 bg-primary-container mt-2" />
        <p className="font-body text-sm text-on-surface-variant mt-3">
          Verifica tu afiliación con cada aliado para desbloquear descuentos exclusivos.
          Se usa el número de cédula guardado en tu perfil.
        </p>
      </div>

      {/* No document warning */}
      {!hasDoc && (
        <div className="bg-surface-container border-l-4 border-error/50 px-5 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-error/70 text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            warning
          </span>
          <div>
            <p className="font-headline font-black text-sm uppercase tracking-tight text-on-surface">
              Cédula no guardada
            </p>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              Guarda tu número de documento en{" "}
              <a href="/app/identidad" className="text-primary-container underline">Identidad</a>{" "}
              antes de verificar beneficios.
            </p>
          </div>
        </div>
      )}

      {/* Doc summary if set */}
      {hasDoc && (
        <div className="bg-surface-container px-5 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-sm text-outline" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
          <div>
            <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">Verificando con</p>
            <p className="font-body text-sm text-on-surface">
              {profile?.tipo_documento} {profile?.numero_documento}
            </p>
          </div>
          <a
            href="/app/identidad"
            className="ml-auto font-headline font-bold text-[10px] uppercase tracking-widest text-outline/60 hover:text-on-surface transition-colors"
          >
            CAMBIAR
          </a>
        </div>
      )}

      {/* Aliados list */}
      {aliados.length === 0 ? (
        <div className="bg-surface-container px-5 py-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-3 block">handshake</span>
          <p className="font-body text-sm text-outline">Sin aliados disponibles por ahora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {aliados.map((aliado) => {
            const verified = isVerified(aliado);
            const checkedAt = verifiedAt(aliado);
            const state = verifyState[aliado.id] ?? "idle";
            const message = verifyMessage[aliado.id] ?? "";
            const loading = state === "loading";

            return (
              <div
                key={aliado.id}
                className={`bg-surface-container border-l-4 ${
                  verified
                    ? "border-secondary-container"
                    : aliado.hasPendingApi
                    ? "border-outline-variant/30"
                    : "border-primary-container/40"
                }`}
              >
                <div className="px-5 py-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      {aliado.logoUrl ? (
                        <img
                          src={aliado.logoUrl}
                          alt={aliado.name}
                          className="w-10 h-10 object-contain bg-surface-container-high p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline text-sm">handshake</span>
                        </div>
                      )}
                      <div>
                        <p className="font-headline font-black text-base uppercase tracking-tight text-on-surface">
                          {aliado.name}
                        </p>
                        {aliado.discounts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {aliado.discounts.map((d, i) => (
                              <span
                                key={i}
                                className="font-headline font-bold text-[10px] uppercase tracking-widest text-primary-container"
                              >
                                {d.pct}% {APPLIES_TO_LABEL[d.appliesTo] ?? d.appliesTo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    {verified && (
                      <span className="bg-secondary-container text-white font-headline font-black text-[10px] px-2.5 py-1 uppercase tracking-widest shrink-0 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        AFILIADO
                      </span>
                    )}
                    {aliado.hasPendingApi && !verified && (
                      <span className="bg-surface-container-high text-outline font-headline font-black text-[10px] px-2.5 py-1 uppercase tracking-widest shrink-0">
                        PRÓXIMO
                      </span>
                    )}
                  </div>

                  {/* Verified at */}
                  {verified && checkedAt && (
                    <p className="font-body text-xs text-outline mb-3">
                      Verificado:{" "}
                      {new Date(checkedAt).toLocaleDateString("es-CO", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  )}

                  {/* Verify button */}
                  {!aliado.hasPendingApi && (
                    <button
                      onClick={() => handleVerify(aliado)}
                      disabled={loading || !hasDoc}
                      className={`w-full font-headline font-black py-3 uppercase tracking-tighter transition-all disabled:opacity-50 skew-fix ${
                        verified
                          ? "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                          : "bg-primary-container text-white hover:opacity-90"
                      }`}
                    >
                      <span className="block skew-content">
                        {loading
                          ? "VERIFICANDO…"
                          : verified
                          ? "RE-VERIFICAR"
                          : "VERIFICAR AFILIACIÓN"}
                      </span>
                    </button>
                  )}

                  {/* Feedback */}
                  {message && (
                    <p className={`font-body text-xs mt-2 px-1 ${
                      state === "error" ? "text-error" :
                      state === "pending" ? "text-outline" :
                      "text-primary-container"
                    }`}>
                      {message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
