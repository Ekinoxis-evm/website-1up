import type { GameCategory, Game } from "@/types/database.types";

const FALLBACK_IMAGES: Record<string, string> = {
  fighting: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
  fps:      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  dancing:  "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80",
  tcg:      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=800&q=80",
};

const ACCENT_CYCLE = [
  { border: "border-primary-container",    badge: "bg-primary-container text-white",    shadow: "neo-shadow-pink"  },
  { border: "border-secondary-container",  badge: "bg-secondary-container text-background", shadow: "neo-shadow-blue"  },
  { border: "border-tertiary",             badge: "bg-tertiary text-background",        shadow: "neo-shadow-green" },
];

interface Props {
  categories: GameCategory[];
  games: Game[];
}

export function JuegosDisplay({ categories, games }: Props) {
  const categoriesWithGames = categories.map((cat) => ({
    ...cat,
    games: games.filter((g) => g.category_id === cat.id),
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-headline font-black text-5xl text-on-background uppercase tracking-tighter">
          NUESTROS <span className="text-primary">JUEGOS</span>
        </h1>
        <div className="h-1 w-24 bg-primary mt-3" />
        <p className="font-body text-sm text-outline mt-4 max-w-xl">
          Explora todos los títulos disponibles en 1UP Gaming Tower — desde fighting games hasta TCG y ritmo.
        </p>
      </div>

      {/* Category sections */}
      <div className="space-y-16">
        {categoriesWithGames.map((cat, i) => {
          const accent = ACCENT_CYCLE[i % ACCENT_CYCLE.length];
          const catImg = cat.image_url || FALLBACK_IMAGES[cat.slug] || FALLBACK_IMAGES.fighting;

          return (
            <section key={cat.id}>
              {/* Category header */}
              <div className="flex items-center gap-4 mb-6">
                <span className={`${accent.badge} font-headline font-black text-sm px-4 py-2 uppercase tracking-wider skew-fix`}>
                  <span className="block skew-content">{cat.name}</span>
                </span>
                <div className={`flex-1 h-0.5 bg-outline-variant/20`} />
                <span className="font-headline font-bold text-xs text-outline uppercase tracking-widest">
                  {cat.games.length} {cat.games.length === 1 ? "juego" : "juegos"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category hero image */}
                <div className={`md:col-span-1 relative overflow-hidden bg-surface-container border-l-4 ${accent.border} aspect-video md:aspect-auto`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={catImg}
                    alt={cat.name}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <p className="font-headline font-black text-xl text-white uppercase">{cat.name}</p>
                  </div>
                </div>

                {/* Games grid */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
                  {cat.games.map((game) => (
                    <div
                      key={game.id}
                      className={`bg-surface-container border-l-4 ${accent.border} overflow-hidden group`}
                    >
                      <div className="w-full aspect-video bg-surface-container-high overflow-hidden">
                        {game.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.image_url}
                            alt={game.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-outline">videogame_asset</span>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="font-headline font-black text-sm text-on-background uppercase leading-tight">
                          {game.name}
                        </p>
                      </div>
                    </div>
                  ))}

                  {cat.games.length === 0 && (
                    <div className="col-span-3 bg-surface-container px-4 py-8 text-center">
                      <p className="font-body text-sm text-outline">Sin juegos en esta categoría aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {categoriesWithGames.length === 0 && (
          <div className="bg-surface-container px-6 py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">videogame_asset</span>
            <p className="font-headline font-black text-xl text-outline uppercase">Los juegos se configuran desde el panel admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
