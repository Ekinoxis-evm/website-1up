"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import type { Course } from "@/types/database.types";
import { formatCop } from "@/lib/utils";

interface Props {
  courses: Course[];
}

export function AdminCoursesClient({ courses }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();

  async function authHeaders() {
    const token = await getAccessToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function handleDeleteCourse(id: number) {
    if (!confirm("¿Eliminar este curso?")) return;
    await fetch("/api/admin/courses", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
            CURSOS <span className="text-tertiary">ACADEMIA</span>
          </h1>
          <div className="h-1 w-16 bg-tertiary mt-2" />
        </div>
        <Link href="/admin/courses/new" className="bg-primary-container text-on-primary-container font-headline font-black text-sm px-6 py-3 skew-fix">
          <span className="block skew-content">+ NUEVO CURSO</span>
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-container-highest">
            {["Imagen", "Curso", "Categoría", "Precio", "Duración", "Acciones"].map((h) => (
              <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr key={c.id} className={i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}>
              <td className="px-4 py-3">
                <div className="w-14 h-10 bg-surface-container-high overflow-hidden flex items-center justify-center">
                  {c.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    : <span className="material-symbols-outlined text-sm text-outline">image</span>
                  }
                </div>
              </td>
              <td className="px-4 py-3 font-headline font-bold text-on-background">{c.name}</td>
              <td className="px-4 py-3">
                <span className="bg-surface-container-highest font-headline font-black text-[10px] px-2 py-1 text-on-surface-variant uppercase">{c.category}</span>
              </td>
              <td className="px-4 py-3">
                <p className="font-body text-primary">{formatCop(c.price_cop)}</p>
                {c.price_token && (
                  <p className="font-headline font-black text-[10px] text-tertiary mt-0.5">{c.price_token} $1UP</p>
                )}
              </td>
              <td className="px-4 py-3 font-body text-on-surface-variant">{c.duration_hours}h</td>
              <td className="px-4 py-3">
                <div className="flex gap-3 items-center">
                  <Link href={`/admin/courses/${c.id}/edit`} className="text-tertiary font-headline font-bold text-xs uppercase">Editar</Link>
                  <button onClick={() => handleDeleteCourse(c.id)} className="text-error font-headline font-bold text-xs uppercase">Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-outline font-body">Sin cursos aún.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
