"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import type { PassConfig } from "@/types/database.types";

interface Props { config: PassConfig }

export function AdminPassConfigCard({ config }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [editing, setEditing]     = useState(false);
  const [price, setPrice]         = useState(String(config.price_token));
  const [recipient, setRecipient] = useState(config.recipient_address);
  const [duration, setDuration]   = useState(String(config.duration_days));
  const [active, setActive]       = useState(config.is_active);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(config.recipient_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    const priceNum    = Number(price);
    const durationNum = Number(duration);

    if (!priceNum || priceNum <= 0)    { setError("El precio debe ser mayor a 0."); return; }
    if (!isAddress(recipient))         { setError("Dirección de destino inválida."); return; }
    if (!durationNum || durationNum < 1) { setError("La duración debe ser al menos 1 día."); return; }

    setSaving(true);
    setError("");
    const token = await getAccessToken();
    const res = await fetch("/api/admin/pass-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        priceToken:       priceNum,
        recipientAddress: recipient,
        durationDays:     durationNum,
        isActive:         active,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Error al guardar.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        {/* ── TREASURY WALLET — prominent block ───────────────── */}
        <div className="bg-surface-container border-l-8 border-tertiary p-6 md:p-7 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="material-symbols-outlined text-tertiary text-3xl shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance_wallet
              </span>
              <div className="min-w-0">
                <p className="font-headline text-[10px] uppercase tracking-widest text-tertiary mb-0.5">
                  Tesorería
                </p>
                <h2 className="font-headline font-black text-xl md:text-2xl uppercase tracking-tighter">
                  Wallet de Tesorería
                </h2>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 font-headline font-bold text-xs uppercase text-secondary hover:text-secondary-container transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
          </div>

          <p className="font-body text-sm text-on-surface/70">
            Esta wallet recibe <strong className="text-on-surface">todos los pagos en $1UP</strong> de
            la plataforma: compras del 1UP Pass e inscripciones a cursos pagadas con tokens.
            Cambiarla afecta inmediatamente ambos flujos.
          </p>

          <div className="bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-headline text-[10px] uppercase tracking-widest text-outline">
                Dirección (Base mainnet)
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 font-headline text-[11px] uppercase tracking-widest text-on-surface/60 hover:text-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={`https://basescan.org/address/${config.recipient_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-headline text-[11px] uppercase tracking-widest text-on-surface/60 hover:text-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  BaseScan
                </a>
              </div>
            </div>
            <p className="font-mono text-sm md:text-base text-on-background break-all leading-relaxed">
              {config.recipient_address}
            </p>
          </div>
        </div>

        {/* ── Pass-specific config ────────────────────────────── */}
        <div className="bg-surface-container p-6 border-l-4 border-primary-container space-y-4">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Configuración del Pass
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Precio</p>
              <p className="font-headline font-black text-2xl">
                {config.price_token.toLocaleString()} <span className="text-sm text-outline">$1UP</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Duración</p>
              <p className="font-headline font-black text-2xl">
                {config.duration_days} <span className="text-sm text-outline">días</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Estado</p>
              <span className={`font-headline text-xs px-2 py-0.5 uppercase ${config.is_active ? "bg-tertiary/20 text-tertiary" : "bg-error/20 text-error"}`}>
                {config.is_active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Última actualización</p>
              <p className="font-body text-xs text-on-surface/60">
                {new Date(config.updated_at).toLocaleDateString("es-CO")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container p-6 border-l-4 border-secondary-container space-y-6">
      <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
        Editar Configuración
      </h2>

      {/* ── Treasury wallet — featured first ───────────────── */}
      <div className="bg-tertiary/5 border-l-4 border-tertiary p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-tertiary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance_wallet
          </span>
          <label className="font-headline font-black text-sm uppercase tracking-widest text-tertiary">
            Wallet de Tesorería
          </label>
        </div>
        <p className="font-body text-xs text-on-surface/60">
          Recibe todos los pagos en $1UP: compras del 1UP Pass e inscripciones a cursos pagadas con tokens.
        </p>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
            Precio Pass ($1UP)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={1}
            className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
          />
        </div>
        <div>
          <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
            Duración (días)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={1}
            className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-headline font-bold text-sm uppercase tracking-wider">Venta activa</span>
          </label>
        </div>
      </div>

      {error && <p className="font-body text-sm text-error">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-container text-white font-headline font-black uppercase tracking-tighter px-6 py-3 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar Configuración"}
        </button>
        <button
          onClick={() => { setEditing(false); setError(""); }}
          className="bg-surface-container-high text-on-surface font-headline font-black uppercase tracking-tighter px-6 py-3"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
