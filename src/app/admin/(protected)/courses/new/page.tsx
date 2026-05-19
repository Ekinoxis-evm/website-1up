"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const CATEGORIES = ["Gaming", "Esports", "Streaming", "Diseño", "Programación", "Marketing", "Otro"];

export default function NewCoursePage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Gaming");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    setLoading(true); setError(null);
    const token = await getAccessToken();
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), category, isActive: false }),
    });
    if (!res.ok) { setError("Error al crear el curso"); setLoading(false); return; }
    const data = await res.json();
    router.push(`/admin/courses/${data.id}/edit`);
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline font-black text-2xl uppercase tracking-tighter">NUEVO CURSO</h1>
      </div>

      <div className="bg-surface-container p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Nombre del curso *</label>
          <input
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej. Fundamentos de League of Legends"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-1">Categoría</label>
          <select
            className="w-full bg-surface border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-primary-container text-on-primary-container font-bold text-sm uppercase tracking-widest py-3 disabled:opacity-50"
        >
          {loading ? "CREANDO..." : "CREAR Y EDITAR"}
        </button>
      </div>
    </div>
  );
}
