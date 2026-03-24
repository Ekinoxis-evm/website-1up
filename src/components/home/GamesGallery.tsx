import type { GameCategory, Game } from "@/types/database.types";

interface Props {
  categories: GameCategory[];
  games: Game[];
}

// Static fallback images (until real ones are uploaded via admin)
const CATEGORY_IMAGES: Record<string, string> = {
  fighting: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
  fps:      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  dancing:  "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80",
  tcg:      "https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=800&q=80",
};

const CATEGORY_LABELS: Record<string, { label: string; bg: string }> = {
  fighting: { label: "FIGHTING",  bg: "bg-primary text-background"          },
  fps:      { label: "FPS",       bg: "bg-secondary-container text-white"    },
  dancing:  { label: "RHYTHM",    bg: "bg-tertiary text-background"          },
  tcg:      { label: "TCG",       bg: "bg-white text-background"             },
};

export function GamesGallery({ categories, games }: Props) {
  const categoriesWithGames = categories.map((cat) => ({
    ...cat,
    games: games.filter((g) => g.category_id === cat.id),
  }));

  // Layout: fighting (2-col 2-row), fps (2-col 1-row), dancing (1-col), tcg (1-col)
  return (
    <section className="py-24 px-6 bg-background">
      <h2 className="font-headline text-4xl font-black mb-12 text-center tracking-widest uppercase">
        Select your <span className="text-primary">Discipline</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 md:h-[640px]">
        {categoriesWithGames.map((cat, i) => {
          const firstGame = cat.games[0];
          const img = cat.image_url || firstGame?.image_url || CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.fighting;
          const meta = CATEGORY_LABELS[cat.slug] ?? { label: cat.name.toUpperCase(), bg: "bg-primary text-background" };
          const gameNames = cat.games.map((g) => g.name).join(" / ");

          const colSpan = i === 0 ? "md:col-span-2 md:row-span-2" : i === 1 ? "md:col-span-2 md:row-span-1" : "md:col-span-1 md:row-span-1";

          return (
            <div key={cat.id} className={`${colSpan} relative group overflow-hidden bg-surface-container cursor-pointer`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={cat.name}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
              <div className={`absolute bottom-0 left-0 ${i < 2 ? "p-8" : "p-6"}`}>
                <span className={`${meta.bg} font-black px-3 py-1 text-xs uppercase mb-2 inline-block font-headline`}>
                  {meta.label}
                </span>
                <h3 className={`font-headline font-black text-white ${i === 0 ? "text-4xl" : i === 1 ? "text-3xl" : "text-xl"}`}>
                  {gameNames || cat.name.toUpperCase()}
                </h3>
              </div>
            </div>
          );
        })}

        {/* Fallback if no categories in DB yet */}
        {categoriesWithGames.length === 0 && (
          <div className="md:col-span-4 md:row-span-2 flex items-center justify-center bg-surface-container text-on-surface-variant font-headline">
            Los juegos se cargan desde el panel de administración.
          </div>
        )}
      </div>
    </section>
  );
}
