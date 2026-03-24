import { db } from "@/db";
import { recruitmentSubmissions, gameCategories, games } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminSubmissionsPage() {
  const subs = await db.select().from(recruitmentSubmissions).orderBy(desc(recruitmentSubmissions.createdAt));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter text-on-background">
          SOLICITUDES <span className="text-primary-container">RECRUITMENT</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-2" />
        <p className="text-outline font-body text-sm mt-2">{subs.length} solicitudes recibidas</p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-highest">
              {["Nombre", "Email", "Teléfono", "Gamertag", "Fuente", "Fecha"].map((h) => (
                <th key={h} className="text-left font-headline font-black text-xs uppercase tracking-widest text-outline px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.map((s, i) => (
              <tr key={s.id} className={`${i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"} hover:bg-surface-container-high transition-colors`}>
                <td className="px-4 py-3 font-headline font-bold text-on-background">{s.name}</td>
                <td className="px-4 py-3 font-body text-on-surface-variant">{s.email}</td>
                <td className="px-4 py-3 font-body text-on-surface-variant">{s.phone}</td>
                <td className="px-4 py-3 font-body text-on-surface-variant">{s.gamertag ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`font-headline font-black text-[10px] px-2 py-1 uppercase ${s.source === "team" ? "bg-primary-container text-white" : "bg-secondary-container text-white"}`}>
                    {s.source}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-outline text-xs">
                  {s.createdAt?.toLocaleDateString("es-CO") ?? "—"}
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-outline font-body">Sin solicitudes aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
