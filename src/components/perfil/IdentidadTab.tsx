"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

interface UserProfile {
  id: number;
  tipo_documento: string | null;
  numero_documento: string | null;
  comfenalco_afiliado: boolean | null;
  comfenalco_verified_at: string | null;
}

const TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PP", "NIT"] as const;
const TIPO_LABELS: Record<string, string> = {
  CC:  "Cédula de Ciudadanía",
  CE:  "Cédula de Extranjería",
  TI:  "Tarjeta de Identidad",
  PP:  "Pasaporte",
  NIT: "NIT",
};

type Status = "idle" | "loading" | "saving" | "verifying" | "success" | "error";

export function IdentidadTab() {
  const { getAccessToken } = usePrivy();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tipoDoc, setTipoDoc] = useState("CC");
  const [numDoc, setNumDoc] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  const fetchProfile = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/user/profile", { headers: await authHeaders() });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
        setTipoDoc(data.tipo_documento ?? "CC");
        setNumDoc(data.numero_documento ?? "");
      }
    } finally {
      setStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSave() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ tipoDocumento: tipoDoc, numeroDocumento: numDoc }),
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
        setMessage("Datos guardados correctamente.");
        setStatus("success");
      } else {
        const { error } = await res.json();
        setMessage(error ?? "Error al guardar.");
        setStatus("error");
      }
    } catch {
      setMessage("Error de red. Intenta nuevamente.");
      setStatus("error");
    }
  }

  async function handleVerify() {
    if (!numDoc.trim()) {
      setMessage("Ingresa tu número de documento primero.");
      setStatus("error");
      return;
    }

    setStatus("verifying");
    setMessage("");
    try {
      const res = await fetch("/api/user/comfenalco/verify", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ tipoDocumento: tipoDoc, numeroDocumento: numDoc }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, comfenalco_afiliado: data.isAffiliated, comfenalco_verified_at: new Date().toISOString() } : prev);
        setMessage(data.message);
        setStatus(data.isAffiliated ? "success" : "idle");
      } else {
        setMessage(data.error ?? "Error al verificar con Comfenalco.");
        setStatus("error");
      }
    } catch {
      setMessage("Error de red. Intenta nuevamente.");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const isBusy    = status === "saving" || status === "verifying";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* ── Document section ──────────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          DOCUMENTO DE IDENTIDAD
        </h2>
        <div className="h-0.5 w-12 bg-secondary-container mb-5" />

        <div className="space-y-3">
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Tipo de documento
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
              disabled={isBusy}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>{TIPO_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Número de documento
            </label>
            <input
              value={numDoc}
              onChange={(e) => setNumDoc(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="Ej: 1020304050"
              disabled={isBusy}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isBusy || !numDoc.trim()}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {status === "saving" ? "GUARDANDO..." : "GUARDAR DATOS"}
          </button>
        </div>
      </div>

      {/* ── Comfenalco section ────────────────────────────────────── */}
      <div className={`p-6 border-l-4 ${profile?.comfenalco_afiliado ? "bg-surface-container border-secondary-container" : "bg-surface-container border-outline-variant/30"}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-headline font-black text-lg uppercase tracking-tighter">
              COMFENALCO
            </h2>
            <p className="font-body text-xs text-on-surface-variant mt-1">
              Verifica tu afiliación para acceder a descuentos exclusivos en cursos y el 1UP Pass.
            </p>
          </div>
          {/* Status badge */}
          {profile?.comfenalco_afiliado === true && (
            <span className="bg-secondary-container text-white font-headline font-black text-xs px-3 py-1.5 uppercase tracking-widest flex-shrink-0 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">verified</span>
              AFILIADO
            </span>
          )}
          {profile?.comfenalco_afiliado === false && profile?.comfenalco_verified_at && (
            <span className="bg-surface-container-highest text-outline font-headline font-black text-xs px-3 py-1.5 uppercase tracking-widest flex-shrink-0">
              NO AFILIADO
            </span>
          )}
        </div>

        {profile?.comfenalco_verified_at && (
          <p className="font-body text-xs text-outline mb-4">
            Última verificación: {new Date(profile.comfenalco_verified_at).toLocaleDateString("es-CO", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={isBusy || !numDoc.trim()}
          className={`w-full font-headline font-black py-3 uppercase tracking-tighter transition-all disabled:opacity-50 skew-fix ${
            profile?.comfenalco_afiliado
              ? "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
              : "bg-secondary-container text-white hover:neo-shadow-pink"
          }`}
        >
          <span className="block skew-content">
            {status === "verifying"
              ? "VERIFICANDO..."
              : profile?.comfenalco_afiliado
                ? "RE-VERIFICAR AFILIACIÓN"
                : "VERIFICAR CON COMFENALCO"}
          </span>
        </button>

        {!numDoc.trim() && (
          <p className="font-body text-xs text-outline mt-2 text-center">
            Guarda tu número de documento antes de verificar.
          </p>
        )}
      </div>

      {/* ── Feedback message ─────────────────────────────────────── */}
      {message && (
        <div className={`p-4 font-body text-sm ${status === "error" ? "bg-error/10 text-error" : "bg-primary-container/10 text-primary"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
