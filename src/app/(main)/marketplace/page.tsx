import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { SOCIAL_ICON, SOCIAL_LABEL } from "@/lib/socialIcons";

export const metadata: Metadata = {
  title: "Marketplace — Compra con $1UP Tokens | 1UP Gaming Tower",
  description:
    "Marketplace del ecosistema 1UP — próximamente. Compra merchandise oficial, periféricos gaming y coleccionables usando tus $1UP tokens. Primer marketplace esports de Colombia.",
  keywords: ["marketplace esports Colombia", "merchandise gaming Colombia", "comprar con tokens esports", "1UP marketplace", "periféricos gaming Cali"],
  openGraph: {
    title: "Marketplace 1UP — Próximamente",
    description: "Merchandise, periféricos y coleccionables. Paga con $1UP tokens en el marketplace del ecosistema 1UP.",
    url: "https://1upesports.org/marketplace",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Marketplace 1UP Gaming Tower" }],
  },
  twitter: { card: "summary_large_image", title: "Marketplace 1UP — Próximamente", description: "Compra con $1UP tokens en el marketplace del ecosistema esports 1UP." },
  alternates: { canonical: "https://1upesports.org/marketplace" },
};

export default async function MarketplacePage() {
  const { data: socialLinks } = await supabase
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .not("url", "is", null)
    .order("sort_order");

  return (
    <>
      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col justify-center px-8 md:px-16 py-24 bg-background">
        <div className="max-w-4xl">
          <div className="inline-block bg-primary-container px-4 py-1 mb-6 skew-fix">
            <span className="text-white font-black italic skew-content block text-sm tracking-widest font-headline">
              PRÓXIMAMENTE
            </span>
          </div>

          <h1 className="font-headline font-black text-6xl md:text-9xl uppercase tracking-tighter leading-none mb-4">
            MARKET<span className="text-primary-container">PLACE</span>
          </h1>
          <div className="h-1 w-24 bg-primary-container mb-10" />

          <p className="font-body text-on-surface/60 text-xl max-w-xl mb-12">
            Compra y vende merchandise, periféricos, coleccionables y más dentro del ecosistema 1UP.
            Pagos con $1UP tokens.
          </p>

          {/* Feature teaser grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: "checkroom",        label: "Merchandise oficial" },
              { icon: "sports_esports",   label: "Periféricos gaming"  },
              { icon: "token",            label: "Paga con $1UP"       },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-surface-container p-5 flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-primary-container text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <span className="font-headline font-bold text-sm uppercase tracking-tight text-on-surface/80">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notify strip */}
      <section className="bg-primary-container px-8 md:px-16 py-12">
        <div className="max-w-4xl flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="flex-1">
            <p className="font-headline font-black text-white text-2xl uppercase tracking-tighter">
              Sé el primero en saber cuándo abre
            </p>
            <p className="font-body text-white/70 text-sm mt-1">
              Síguenos en redes sociales para el anuncio oficial de apertura.
            </p>
          </div>
          {(socialLinks ?? []).length > 0 && (
            <div className="flex items-center gap-4">
              {(socialLinks ?? []).map((s) => (
                <a
                  key={s.id}
                  href={s.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_LABEL[s.platform] ?? s.platform}
                  className="opacity-70 hover:opacity-100 transition-opacity hover:scale-110 transform"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SOCIAL_ICON[s.platform] ?? `/socialmedia/${s.platform}.png`}
                    alt={s.platform}
                    className="w-7 h-7 object-contain brightness-0 invert"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
