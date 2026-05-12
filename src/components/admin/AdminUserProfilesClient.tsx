"use client";

import type { UserProfile } from "@/types/database.types";

interface Props { profiles: UserProfile[] }

const DOC_BADGE: Record<string, string> = {
  CC:  "bg-primary-container/20 text-primary",
  CE:  "bg-secondary-container/20 text-secondary",
  TI:  "bg-tertiary/20 text-tertiary",
  PP:  "bg-outline/10 text-outline",
  NIT: "bg-outline/10 text-outline",
};

const TH = "font-headline text-[10px] uppercase tracking-widest text-outline text-left px-3 py-2.5 whitespace-nowrap";
const TD = "px-3 py-3 align-top";

export function AdminUserProfilesClient({ profiles }: Props) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          USUARIOS <span className="text-primary-container">REGISTRADOS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">
          {profiles.length} usuario{profiles.length !== 1 ? "s" : ""} registrado{profiles.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className={TH}>Email</th>
              <th className={TH}>Documento</th>
              <th className={TH}>Comfenalco</th>
              <th className={TH}>Privy ID</th>
              <th className={TH}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr
                key={p.id}
                className="border-t border-surface-container-high bg-surface-container hover:bg-surface-container-high/50 transition-colors"
              >
                <td className={`${TD} font-body text-sm text-on-background`}>{p.email ?? "—"}</td>

                <td className={TD}>
                  <div className="flex items-center gap-2">
                    {p.tipo_documento && (
                      <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${DOC_BADGE[p.tipo_documento] ?? ""}`}>
                        {p.tipo_documento}
                      </span>
                    )}
                    <span className="font-mono text-xs text-on-background/70">{p.numero_documento ?? "—"}</span>
                  </div>
                </td>

                <td className={TD}>
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${p.comfenalco_afiliado ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                    {p.comfenalco_afiliado ? "Verificado" : "No verificado"}
                  </span>
                </td>

                <td className={`${TD} font-mono text-[10px] text-on-background/40 max-w-[160px] truncate`}>
                  {p.privy_user_id}
                </td>

                <td className={`${TD} font-body text-xs text-outline whitespace-nowrap`}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {profiles.length === 0 && (
          <div className="py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            Sin usuarios registrados.
          </div>
        )}
      </div>
    </div>
  );
}
