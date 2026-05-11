import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { JuegosDisplay } from "@/components/juegos/JuegosDisplay";

export const metadata: Metadata = {
  title: "Juegos — Catálogo Gaming 1UP Tower Colombia",
  description:
    "Explora todos los juegos disponibles en 1UP Gaming Tower: FPS, MOBA, Battle Royale, deportes y más. Múltiples categorías para todos los estilos de juego en Cali, Colombia.",
  keywords: ["juegos gaming Cali", "catálogo esports Colombia", "PC gaming Colombia", "videojuegos 1UP", "games esports Cali"],
  openGraph: {
    title: "Juegos — Catálogo 1UP Gaming Tower",
    description: "FPS, MOBA, Battle Royale y más. El catálogo completo de juegos del primer gaming tower de Colombia.",
    url: "https://1upesports.org/juegos",
    type: "website",
    images: [{ url: "/1up.png", width: 512, height: 512, alt: "Juegos 1UP Gaming Tower" }],
  },
  twitter: { card: "summary_large_image", title: "Juegos 1UP Gaming Tower", description: "Catálogo completo de juegos disponibles en 1UP Gaming Tower Cali." },
  alternates: { canonical: "https://1upesports.org/juegos" },
};

export default async function JuegosPage() {
  const [{ data: categories }, { data: games }] = await Promise.all([
    supabase.from("game_categories").select("*").order("sort_order"),
    supabase.from("games").select("*").order("sort_order"),
  ]);

  return <JuegosDisplay categories={categories ?? []} games={games ?? []} />;
}
