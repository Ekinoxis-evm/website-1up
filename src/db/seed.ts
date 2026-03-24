/**
 * Run once to populate initial data:
 *   npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { db } from "./index";
import {
  gameCategories, games, players, competitions,
  courses, passBenefits, floorInfo,
} from "./schema";

async function main() {
  console.log("🌱 Seeding database...");

  // ── Game Categories ────────────────────────────────────────────
  const [fighting, fps, dancing, tcg] = await db.insert(gameCategories).values([
    { name: "Fighting",           slug: "fighting",  sortOrder: 1 },
    { name: "FPS",                slug: "fps",       sortOrder: 2 },
    { name: "Dancing",            slug: "dancing",   sortOrder: 3 },
    { name: "Trading Card Games", slug: "tcg",       sortOrder: 4 },
  ]).returning();

  // ── Games ──────────────────────────────────────────────────────
  await db.insert(games).values([
    { name: "Fatal Fury",              categoryId: fighting.id, sortOrder: 1 },
    { name: "2XKO",                    categoryId: fighting.id, sortOrder: 2 },
    { name: "Street Fighter 6",        categoryId: fighting.id, sortOrder: 3 },
    { name: "Super Smash Bros. Ultimate", categoryId: fighting.id, sortOrder: 4 },
    { name: "Call of Duty",            categoryId: fps.id,      sortOrder: 1 },
    { name: "Just Dance",              categoryId: dancing.id,  sortOrder: 1 },
    { name: "Pokémon TCG",             categoryId: tcg.id,      sortOrder: 1 },
    { name: "Magic: The Gathering",    categoryId: tcg.id,      sortOrder: 2 },
  ]);

  // ── Players ────────────────────────────────────────────────────
  const [mado, misterio, misili, maxi] = await db.insert(players).values([
    { gamertag: "Mado Kula",  realName: "Por definir", role: "CAPTAIN",  sortOrder: 1 },
    { gamertag: "Misterio",   realName: "Por definir", role: "STRIKER",  sortOrder: 2 },
    { gamertag: "Misili",     realName: "Por definir", role: "DEFENDER", sortOrder: 3 },
    { gamertag: "Maxi",       realName: "Por definir", role: "SUPPORT",  sortOrder: 4 },
  ]).returning();

  // ── Competitions ───────────────────────────────────────────────
  await db.insert(competitions).values([
    { tournamentName: "EVO",         country: "Francia",            city: "Paris",         year: 2021, result: "TOP 8 GLOBAL",  playerId: mado.id },
    { tournamentName: "Black Spawn", country: "República Dominicana", city: "Santo Domingo", year: 2016, result: "CHAMPIONS",    playerId: misterio.id },
    { tournamentName: "SNK",         country: "USA",                city: "Las Vegas",     year: 2025, result: "TOP 4",         playerId: misili.id },
  ]);

  // ── Courses ────────────────────────────────────────────────────
  await db.insert(courses).values([
    { name: "Player Mindset",       category: "Performance", description: "Desarrolla la mentalidad competitiva y forja tu carrera profesional.", priceCop: 100000, durationHours: 4, sortOrder: 1 },
    { name: "Finanzas Tecnológicas",category: "Technology",  description: "Entiende el ecosistema financiero digital y las oportunidades del Web3.", priceCop: 100000, durationHours: 4, sortOrder: 1 },
    { name: "Construye Apps con AI",category: "Technology",  description: "Aprende a crear aplicaciones con inteligencia artificial sin código avanzado.", priceCop: 100000, durationHours: 4, sortOrder: 2 },
    { name: "Fatal Fury",           category: "Gaming",      description: "Técnica y estrategia de alto nivel para Fatal Fury con coaches pro.", priceCop: 100000, durationHours: 4, sortOrder: 1 },
    { name: "Street Fighter 6",     category: "Gaming",      description: "Frame data, punishes y estrategia avanzada en SF6.", priceCop: 100000, durationHours: 4, sortOrder: 2 },
    { name: "2XKO",                 category: "Gaming",      description: "Primeros pasos y meta actual del nuevo título de Riot Games.", priceCop: 100000, durationHours: 4, sortOrder: 3 },
  ]);

  // ── 1UP Pass Benefits ──────────────────────────────────────────
  await db.insert(passBenefits).values([
    { title: "Acceso al lugar",                   description: "Entrada libre durante el período del pass.", sortOrder: 1 },
    { title: "Participación en torneos organizados", description: "Competencias internas exclusivas para holders del pass.", sortOrder: 2 },
    { title: "Uso de equipos en instalaciones",   description: "100 PlayStation + monitores pro-grade a tu disposición.", sortOrder: 3 },
  ]);

  // ── Floor Info ─────────────────────────────────────────────────
  await db.insert(floorInfo).values([
    {
      floorLabel: "01", title: "TRADING CARDS & FIGHTING",
      description: "Área de Trading Cards, Fighting Games, Cafetería y espacio Just Dance.",
      accentColor: "tertiary", sortOrder: 1,
    },
    {
      floorLabel: "02-03", title: "ESPORTS ARENA LAN",
      description: "Torneos LAN de Call of Duty y Salones de clase para la Academia.",
      accentColor: "secondary-container", sortOrder: 2,
    },
    {
      floorLabel: "04-05", title: "HACKER HOUSE",
      description: "Habitaciones, Hacker House para gamers y oficinas del equipo.",
      accentColor: "primary", sortOrder: 3,
    },
    {
      floorLabel: "06", title: "ARENA GAMER",
      description: "Pantalla gigante, graderías para espectadores y estaciones 1v1 online.",
      accentColor: "primary-container", sortOrder: 4,
    },
  ]);

  console.log("✅ Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
