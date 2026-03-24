"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type DbAdmin = {
  id: number;
  email: string;
  added_by: string | null;
  created_at: string | null;
};

type Props = {
  dbAdmins: DbAdmin[];
  envAdmins: string[];
};

export function AdminUsersClient({ dbAdmins: initial, envAdmins }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  const [dbAdmins, setDbAdmins] = useState<DbAdmin[]>(initial);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDbAdmins((prev) => [...prev, data]);
      setNewEmail("");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: await authHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setDbAdmins((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline font-black text-4xl text-on-background uppercase tracking-tighter">
          GESTIÓN DE <span className="text-primary-container">ADMINS</span>
        </h1>
        <div className="h-1 w-20 bg-primary-container mt-2" />
        <p className="font-body text-sm text-outline mt-3">
          Los admins raíz (env) siempre tienen acceso y no pueden eliminarse desde aquí.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-error/10 border-l-4 border-error px-5 py-3 font-body text-sm text-error">
          {error}
        </div>
      )}

      {/* Root admins (env — read-only) */}
      <section className="mb-10">
        <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
          Admins Raíz (ENV)
        </h2>
        <div className="space-y-2">
          {envAdmins.map((email) => (
            <div
              key={email}
              className="bg-surface-container flex items-center justify-between px-5 py-4 border-l-4 border-tertiary"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
                <span className="font-body text-sm text-on-surface">{email}</span>
              </div>
              <span className="font-headline text-[10px] uppercase tracking-widest text-tertiary border border-tertiary/30 px-2 py-1">
                RAÍZ
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* DB admins */}
      <section className="mb-10">
        <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
          Admins Adicionales ({dbAdmins.length})
        </h2>

        {dbAdmins.length === 0 ? (
          <div className="bg-surface-container px-5 py-8 text-center">
            <p className="font-body text-sm text-outline">Sin admins adicionales</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dbAdmins.map((admin) => (
              <div
                key={admin.id}
                className="bg-surface-container flex items-center justify-between px-5 py-4 border-l-4 border-secondary-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-body text-sm text-on-surface">{admin.email}</span>
                  <span className="font-body text-xs text-outline">
                    Añadido por {admin.added_by ?? "—"} ·{" "}
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString("es-CO") : "—"}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(admin.id)}
                  disabled={deletingId === admin.id}
                  className="font-headline font-bold text-xs uppercase tracking-wider text-error/60 border border-error/20 px-3 py-1.5 hover:text-error hover:border-error/50 transition-colors disabled:opacity-40"
                >
                  {deletingId === admin.id ? "…" : "ELIMINAR"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add new admin */}
      <section>
        <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
          Agregar Admin
        </h2>
        <form onSubmit={handleAdd} className="bg-surface-container p-6 border-l-4 border-primary-container">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              required
              className="flex-1 bg-surface-container-high border-none border-b-2 border-outline focus:border-primary-container focus:ring-0 text-on-surface px-4 py-3 font-body text-sm placeholder:text-outline"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-primary-container text-white px-8 py-3 font-headline font-black text-sm uppercase tracking-tighter hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              {adding ? "AGREGANDO…" : "+ AGREGAR"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
