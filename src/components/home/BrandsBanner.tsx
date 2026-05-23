// H-1: the banner only renders the logo, name and an optional website link.
// Typing the prop to exactly that shape stops api_key / api_url from ever being
// accidentally widened back into the public query — the compiler enforces the
// narrow select in src/app/(main)/page.tsx.
type BrandLogo = {
  name:         string;
  logo_url:     string | null;
  website_url:  string | null;
};

interface Props { logos: BrandLogo[] }

export function BrandsBanner({ logos }: Props) {
  if (logos.length === 0) return null;

  const multiplier = Math.max(1, Math.ceil(6 / logos.length));
  const track = Array.from({ length: multiplier }, () => logos).flat();
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
              src={logo.logo_url!}
              alt={logo.name}
              className="h-[80px] w-auto object-contain opacity-70 hover:opacity-100 transition-opacity shrink-0"
            />
          );
          return logo.website_url ? (
            <a key={i} href={logo.website_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
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
