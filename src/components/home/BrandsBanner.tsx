import type { BrandLogo } from "@/types/database.types";

interface Props { logos: BrandLogo[] }

export function BrandsBanner({ logos }: Props) {
  if (logos.length === 0) return null;

  // Ensure at least 6 items per half so the marquee doesn't look sparse with few logos
  const multiplier = Math.max(1, Math.ceil(6 / logos.length));
  const track = Array.from({ length: multiplier }, () => logos).flat();
  // Two identical halves: animation translates -50% through the first, resets seamlessly
  const doubled = [...track, ...track];

  return (
    <section className="bg-white py-6 overflow-hidden">
      <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-black/30 text-center mb-4">
        Aliados y Sponsors
      </p>
      <div className="animate-marquee gap-12 items-center px-6">
        {doubled.map((logo, i) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.logo_url}
              alt={logo.name}
              className="h-[80px] w-auto object-contain opacity-70 hover:opacity-100 transition-opacity shrink-0"
            />
          );
          return logo.website_url ? (
            <a
              key={i}
              href={logo.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              {img}
            </a>
          ) : (
            <div key={i} className="shrink-0">{img}</div>
          );
        })}
      </div>
    </section>
  );
}
