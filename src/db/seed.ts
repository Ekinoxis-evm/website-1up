/**
 * Run once to populate initial data:
 *   npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  console.log("🌱 Seeding database...");

  // ── Game Categories ────────────────────────────────────────────
  const { data: categories } = await supabase.from("game_categories").insert([
    { name: "Fighting",           slug: "fighting",  sort_order: 1 },
    { name: "FPS",                slug: "fps",       sort_order: 2 },
    { name: "Dancing",            slug: "dancing",   sort_order: 3 },
    { name: "Trading Card Games", slug: "tcg",       sort_order: 4 },
  ]).select();

  if (!categories) throw new Error("Failed to insert categories");
  const [fighting, fps, dancing, tcg] = categories;

  // ── Games ──────────────────────────────────────────────────────
  await supabase.from("games").insert([
    { name: "Fatal Fury",                 category_id: fighting.id, sort_order: 1 },
    { name: "2XKO",                       category_id: fighting.id, sort_order: 2 },
    { name: "Street Fighter 6",           category_id: fighting.id, sort_order: 3 },
    { name: "Super Smash Bros. Ultimate", category_id: fighting.id, sort_order: 4 },
    { name: "Call of Duty",               category_id: fps.id,      sort_order: 1 },
    { name: "Just Dance",                 category_id: dancing.id,  sort_order: 1 },
    { name: "Pokémon TCG",                category_id: tcg.id,      sort_order: 1 },
    { name: "Magic: The Gathering",       category_id: tcg.id,      sort_order: 2 },
  ]);

  // ── Players ────────────────────────────────────────────────────
  const { data: players } = await supabase.from("players").insert([
    { gamertag: "Mado Kula",  real_name: "Por definir", role: "CAPTAIN",  sort_order: 1 },
    { gamertag: "Misterio",   real_name: "Por definir", role: "STRIKER",  sort_order: 2 },
    { gamertag: "Misili",     real_name: "Por definir", role: "DEFENDER", sort_order: 3 },
    { gamertag: "Maxi",       real_name: "Por definir", role: "SUPPORT",  sort_order: 4 },
  ]).select();

  if (!players) throw new Error("Failed to insert players");
  const [mado, misterio, misili] = players;

  // ── Competitions ───────────────────────────────────────────────
  await supabase.from("competitions").insert([
    { tournament_name: "EVO",         country: "Francia",              city: "Paris",         year: 2021, result: "TOP 8 GLOBAL",  player_id: mado.id },
    { tournament_name: "Black Spawn", country: "República Dominicana", city: "Santo Domingo", year: 2016, result: "CHAMPIONS",      player_id: misterio.id },
    { tournament_name: "SNK",         country: "USA",                  city: "Las Vegas",     year: 2025, result: "TOP 4",          player_id: misili.id },
  ]);

  // ── Courses ────────────────────────────────────────────────────
  await supabase.from("courses").insert([
    { name: "Player Mindset",        category: "Performance", description: "Desarrolla la mentalidad competitiva y forja tu carrera profesional.",           price_cop: 100000, duration_hours: 4, sort_order: 1 },
    { name: "Finanzas Tecnológicas", category: "Technology",  description: "Entiende el ecosistema financiero digital y las oportunidades del Web3.",        price_cop: 100000, duration_hours: 4, sort_order: 1 },
    { name: "Construye Apps con AI", category: "Technology",  description: "Aprende a crear aplicaciones con inteligencia artificial sin código avanzado.",  price_cop: 100000, duration_hours: 4, sort_order: 2 },
    { name: "Fatal Fury",            category: "Gaming",      description: "Técnica y estrategia de alto nivel para Fatal Fury con coaches pro.",            price_cop: 100000, duration_hours: 4, sort_order: 1 },
    { name: "Street Fighter 6",      category: "Gaming",      description: "Frame data, punishes y estrategia avanzada en SF6.",                            price_cop: 100000, duration_hours: 4, sort_order: 2 },
    { name: "2XKO",                  category: "Gaming",      description: "Primeros pasos y meta actual del nuevo título de Riot Games.",                  price_cop: 100000, duration_hours: 4, sort_order: 3 },
  ]);

  // ── 1UP Pass Benefits ──────────────────────────────────────────
  await supabase.from("pass_benefits").insert([
    { title: "Acceso al lugar",                      description: "Entrada libre durante el período del pass.",                              sort_order: 1 },
    { title: "Participación en torneos organizados", description: "Competencias internas exclusivas para holders del pass.",                  sort_order: 2 },
    { title: "Uso de equipos en instalaciones",      description: "100 PlayStation + monitores pro-grade a tu disposición.",                 sort_order: 3 },
  ]);

  // ── Floor Info ─────────────────────────────────────────────────
  await supabase.from("floor_info").insert([
    { floor_label: "01",    title: "TRADING CARDS & FIGHTING", description: "Área de Trading Cards, Fighting Games, Cafetería y espacio Just Dance.",     accent_color: "tertiary",           sort_order: 1 },
    { floor_label: "02-03", title: "ESPORTS ARENA LAN",        description: "Torneos LAN de Call of Duty y Salones de clase para la Academia.",            accent_color: "secondary-container", sort_order: 2 },
    { floor_label: "04-05", title: "HACKER HOUSE",             description: "Habitaciones, Hacker House para gamers y oficinas del equipo.",               accent_color: "primary",             sort_order: 3 },
    { floor_label: "06",    title: "ARENA GAMER",              description: "Pantalla gigante, graderías para espectadores y estaciones 1v1 online.",      accent_color: "primary-container",   sort_order: 4 },
  ]);

  console.log("✅ Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
