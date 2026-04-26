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
      <div className="bg-surface-container p-6 border-l-4 border-primary-container space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
            Configuración del Pass
          </h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 font-headline font-bold text-xs uppercase text-secondary hover:text-secondary-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Editar
          </button>
        </div>

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

        <div>
          <p className="text-[10px] font-headline uppercase text-outline mb-1">Dirección destino</p>
          <p className="font-mono text-xs text-on-background/70 break-all">{config.recipient_address}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container p-6 border-l-4 border-secondary-container space-y-4">
      <h2 className="font-headline font-black text-xl uppercase tracking-tighter">
        Editar Configuración
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
            Precio ($1UP)
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

      <div>
        <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
          Dirección destino (wallet admin)
        </label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-mono text-sm"
        />
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
