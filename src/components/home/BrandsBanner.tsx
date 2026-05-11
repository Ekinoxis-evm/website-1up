import type { BrandLogo } from "@/types/database.types";

interface Props { logos: BrandLogo[] }

export function BrandsBanner({ logos }: Props) {
  if (logos.length === 0) return null;

  // Duplicate logos for seamless infinite scroll
  const doubled = [...logos, ...logos];

  return (
    <section className="bg-white py-5 overflow-hidden border-y-4 border-outline-variant/10">
      <div className="animate-marquee gap-12 items-center px-6">
        {doubled.map((logo, i) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
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
