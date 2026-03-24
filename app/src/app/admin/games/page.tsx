import { db } from "@/db";
import { games, gameCategories } from "@/db/schema";
import { AdminGamesClient } from "@/components/admin/AdminGamesClient";

export default async function AdminGamesPage() {
  const [allGames, allCategories] = await Promise.all([
    db.select().from(games).orderBy(games.sortOrder),
    db.select().from(gameCategories).orderBy(gameCategories.sortOrder),
  ]);
  return <AdminGamesClient games={allGames} categories={allCategories} />;
}
