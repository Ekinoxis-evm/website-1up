export const metadata = { title: "Mis Cursos — 1UP App" };

export default function AppAcademiaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-none tracking-tighter">
          MIS <span className="text-secondary">CURSOS</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-3" />
      </div>

      {/* Empty state — enrollment list needs enrollments table (now live) */}
      <div className="bg-surface-container-low p-12 flex flex-col items-center justify-center gap-6 text-center">
        <span
          className="material-symbols-outlined text-on-surface/15 text-6xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          school
        </span>
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter mb-2">
            Sin cursos inscritos
          </h2>
          <p className="font-body text-on-surface/50 max-w-md">
            Aquí verás los cursos en los que estés inscrito, el acceso al
            contenido y tus certificados en blockchain.
          </p>
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org"}/academia`}
          className="bg-secondary-container text-white px-10 py-4 font-headline font-black text-lg uppercase tracking-tighter skew-fix hover:neo-shadow-pink transition-all active:scale-95"
        >
          <span className="block skew-content">VER CURSOS</span>
        </a>
      </div>
    </div>
  );
}
