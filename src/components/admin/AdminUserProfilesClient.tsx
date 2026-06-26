"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { UserProfile } from "@/types/database.types";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  profiles: UserProfile[];
  gameNames: Record<number, string>;
}

const TH = "font-headline text-[10px] uppercase tracking-widest text-outline text-left px-3 py-2.5 whitespace-nowrap";
const TD = "px-3 py-3 align-middle";

const PASS_BADGE: Record<string, string> = {
  active:  "bg-tertiary/20 text-tertiary",
  expired: "bg-error/20 text-error",
  never:   "bg-outline/10 text-outline",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function shortWallet(w: string | null | undefined) {
  if (!w) return null;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

export function AdminUserProfilesClient({ profiles, gameNames }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.nombre, p.apellidos, p.email, p.username, p.wallet_address, p.numero_documento]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [profiles, query]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          USUARIOS <span className="text-primary-container">REGISTRADOS</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">
          {profiles.length} usuario{profiles.length !== 1 ? "s" : ""} · clic en una fila para ver el perfil completo
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, correo, usuario, wallet o documento…"
        className="w-full md:max-w-md mb-5 bg-surface-container-highest p-3 font-body text-sm border-none focus:outline-none"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className={TH}>Usuario</th>
              <th className={TH}>Email</th>
              <th className={TH}>Wallet</th>
              <th className={TH}>Login</th>
              <th className={TH}>Pass</th>
              <th className={TH}>Onboarding</th>
              <th className={TH}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="border-t border-surface-container-high bg-surface-container hover:bg-surface-container-high/60 transition-colors cursor-pointer"
              >
                <td className={`${TD}`}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={p.avatar_url}
                      name={[p.nombre, p.apellidos].filter(Boolean).join(" ") || p.username || p.email || null}
                      size="sm"
                      square
                    />
                    <div className="min-w-0">
                      <p className="font-body text-sm text-on-background truncate">
                        {[p.nombre, p.apellidos].filter(Boolean).join(" ") || "—"}
                      </p>
                      {p.username && <p className="font-body text-[10px] text-outline truncate">@{p.username}</p>}
                    </div>
                  </div>
                </td>
                <td className={`${TD} font-body text-sm text-on-background/80`}>{p.email ?? "—"}</td>
                <td className={`${TD} font-mono text-xs text-on-background/60`}>
                  {shortWallet(p.wallet_address) ?? <span className="text-outline/50">—</span>}
                </td>
                <td className={`${TD} font-body text-xs text-on-background/60 capitalize`}>
                  {p.auth_provider ?? "—"}
                </td>
                <td className={TD}>
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${PASS_BADGE[p.pass_status] ?? PASS_BADGE.never}`}>
                    {p.pass_status === "active" ? "Activo" : p.pass_status === "expired" ? "Expirado" : "Nunca"}
                  </span>
                </td>
                <td className={TD}>
                  <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${p.onboarding_completed_at ? "bg-tertiary/20 text-tertiary" : "bg-outline/10 text-outline"}`}>
                    {p.onboarding_completed_at ? "Completo" : "Pendiente"}
                  </span>
                </td>
                <td className={`${TD} font-body text-xs text-outline whitespace-nowrap`}>
                  {fmtDate(p.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="py-20 text-center text-on-surface/30 font-headline uppercase text-sm">
            {query ? "Sin resultados." : "Sin usuarios registrados."}
          </div>
        )}
      </div>

      {selected && (
        <PlayerDetailModal
          profile={selected}
          gameNames={gameNames}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Detail modal ─────────────────────────────────────────────────────────────

type Activity = {
  registrations: { id: number; status: string; registered_at: string | null; tournaments: { name: string; date: string | null; status: string } | null }[];
  enrollments:   { id: number; payment_status: string | null; final_price_cop: number | null; created_at: string | null; courses: { name: string } | null }[];
  passOrders:    { id: number; status: string; payment_method: string | null; duration_days: number | null; started_at: string | null; expires_at: string | null; created_at: string | null }[];
  tokenOrders:   { id: number; status: string; cop_amount: number | null; token_amount: number | null; created_at: string | null }[];
  results:       { id: number; position: number; points: number | null; tournaments: { name: string } | null }[];
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-headline text-[10px] uppercase tracking-widest text-outline mb-0.5">{label}</p>
      <div className="font-body text-sm text-on-background break-words">{children}</div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container p-4">
      <p className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container mb-3">
        {title}{count !== undefined && ` (${count})`}
      </p>
      {children}
    </div>
  );
}

function PlayerDetailModal({
  profile, gameNames, onClose,
}: {
  profile: UserProfile;
  gameNames: Record<number, string>;
  onClose: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/user-detail?id=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError(true); setLoading(false); return; }
      setActivity(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, profile.id]);

  useEffect(() => { load(); }, [load]);

  const fullName = [profile.nombre, profile.apellidos].filter(Boolean).join(" ") || profile.email || "Usuario";
  const games = (profile.game_ids ?? []).map((id) => gameNames[id]).filter(Boolean);
  const aliados = Array.isArray(profile.verified_aliados) ? profile.verified_aliados : [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-low w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar
              src={profile.avatar_url}
              name={fullName}
              size="lg"
              square
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="font-headline font-black text-xl uppercase tracking-tighter truncate">{fullName}</h2>
              <p className="font-body text-[11px] text-outline">
                {profile.username ? `@${profile.username} · ` : ""}ID #{profile.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Identity */}
          <Section title="Identidad">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">{profile.email ?? "—"}</Field>
              <Field label="Método de login">
                <span className="capitalize">{profile.auth_provider ?? "—"}</span>
              </Field>
              <Field label="Wallet $1UP">
                {profile.wallet_address ? (
                  <a
                    href={`https://basescan.org/address/${profile.wallet_address}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-secondary hover:underline break-all"
                  >
                    {profile.wallet_address}
                  </a>
                ) : <span className="text-outline">Sin wallet</span>}
              </Field>
              <Field label="Privy desde">{fmtDate(profile.privy_created_at)}</Field>
              <Field label="Privy User ID">
                <span className="font-mono text-[10px] text-on-background/50 break-all">{profile.privy_user_id}</span>
              </Field>
              <Field label="Cuentas vinculadas">
                {Array.isArray(profile.linked_accounts) && profile.linked_accounts.length > 0
                  ? (profile.linked_accounts as { type: string }[]).map((a) => a.type).join(", ")
                  : "—"}
              </Field>
            </div>
          </Section>

          {/* Profile data */}
          <Section title="Datos del perfil">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Documento">
                {profile.tipo_documento ? `${profile.tipo_documento} ${profile.numero_documento ?? ""}` : "—"}
              </Field>
              <Field label="Teléfono">
                {profile.phone_number ? `${profile.phone_country ?? ""} ${profile.phone_number}` : "—"}
              </Field>
              <Field label="Ubicación">
                {[profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "—"}
              </Field>
              <Field label="Nacimiento">{fmtDate(profile.birth_date)}</Field>
              <Field label="Juegos">{games.length ? games.join(", ") : "—"}</Field>
              <Field label="Código de referido">{profile.referred_by_code ?? "—"}</Field>
            </div>
          </Section>

          {/* Status */}
          <Section title="Estado">
            <div className="grid grid-cols-2 gap-4">
              <Field label="1UP Pass">
                <span className={`font-headline text-[10px] px-2 py-0.5 uppercase ${PASS_BADGE[profile.pass_status] ?? PASS_BADGE.never}`}>
                  {profile.pass_status === "active" ? "Activo" : profile.pass_status === "expired" ? "Expirado" : "Nunca"}
                </span>
              </Field>
              <Field label="Onboarding">
                {profile.onboarding_completed_at ? `Completo · ${fmtDate(profile.onboarding_completed_at)}` : "Pendiente"}
              </Field>
              <Field label="Comfenalco">
                {profile.comfenalco_afiliado ? "Verificado" : "No verificado"}
              </Field>
              <Field label="Aliados verificados">
                {aliados.length ? `${aliados.length}` : "—"}
              </Field>
            </div>
          </Section>

          {/* Activity */}
          {loading && (
            <p className="font-body text-sm text-outline text-center py-6">Cargando actividad…</p>
          )}
          {error && (
            <p className="font-body text-sm text-error text-center py-6">No se pudo cargar la actividad.</p>
          )}
          {activity && (
            <>
              <Section title="Torneos inscritos" count={activity.registrations.length}>
                {activity.registrations.length === 0 ? (
                  <p className="font-body text-sm text-outline">Sin inscripciones.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activity.registrations.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-on-background">{r.tournaments?.name ?? "—"}</span>
                        <span className="font-headline text-[10px] uppercase text-outline">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Cursos" count={activity.enrollments.length}>
                {activity.enrollments.length === 0 ? (
                  <p className="font-body text-sm text-outline">Sin inscripciones a cursos.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activity.enrollments.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-on-background">{e.courses?.name ?? "—"}</span>
                        <span className="font-headline text-[10px] uppercase text-outline">{e.payment_status ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Órdenes 1UP Pass" count={activity.passOrders.length}>
                {activity.passOrders.length === 0 ? (
                  <p className="font-body text-sm text-outline">Sin órdenes de pass.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activity.passOrders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-on-background">
                          {o.payment_method ?? "—"} · {o.duration_days ?? "—"} días
                        </span>
                        <span className="font-headline text-[10px] uppercase text-outline">{o.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Órdenes de tokens" count={activity.tokenOrders.length}>
                {activity.tokenOrders.length === 0 ? (
                  <p className="font-body text-sm text-outline">Sin compras de tokens.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activity.tokenOrders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-on-background">
                          {o.token_amount ?? "—"} $1UP
                        </span>
                        <span className="font-headline text-[10px] uppercase text-outline">{o.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {activity.results.length > 0 && (
                <Section title="Podios" count={activity.results.length}>
                  <ul className="space-y-1.5">
                    {activity.results.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-on-background">{r.tournaments?.name ?? "—"}</span>
                        <span className="font-headline text-[10px] uppercase text-tertiary">
                          #{r.position} · {r.points ?? 0} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
