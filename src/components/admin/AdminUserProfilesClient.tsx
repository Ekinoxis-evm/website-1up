"use client";

import type { UserProfile } from "@/types/database.types";

interface Props { profiles: UserProfile[] }

export function AdminUserProfilesClient({ profiles }: Props) {
  const DOC_BADGE: Record<string, string> = {
    CC: "bg-primary-container/20 text-primary",
    CE: "bg-secondary-container/20 text-secondary",
    TI: "bg-tertiary/20 text-tertiary",
    PP: "bg-outline/10 text-outline",
    NIT: "bg-outline/10 text-outline",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          USUARIOS <span className="text-primary-container">REGISTRADOS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">{profiles.length} usuario{profiles.length !== 1 ? "s" : ""} registrado{profiles.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="bg-surface-container p-4 border-l-4 border-outline-variant/30 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Email</p>
              <p className="font-body text-sm text-on-background truncate">{p.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Documento</p>
              <div className="flex items-center gap-2">
                {p.tipo_documento && (
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${DOC_BADGE[p.tipo_documento] ?? ""}`}>
                    {p.tipo_documento}
                  </span>
                )}
                <span className="font-mono text-xs text-on-background/70">{p.numero_documento ?? "—"}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Comfenalco</p>
              <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${p.comfenalco_afiliado ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                {p.comfenalco_afiliado ? "Verificado" : "No verificado"}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Privy ID</p>
              <p className="font-mono text-[10px] text-on-background/40 truncate">{p.privy_user_id}</p>
            </div>
            <div>
              <p className="text-[10px] font-headline uppercase text-outline mb-1">Registro</p>
              <p className="font-body text-xs text-on-background/60">
                {p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "—"}
              </p>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            Sin usuarios registrados.
          </div>
        )}
      </div>
    </div>
  );
}
