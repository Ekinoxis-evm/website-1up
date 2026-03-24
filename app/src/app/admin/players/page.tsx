import { db } from "@/db";
import { players } from "@/db/schema";
import { AdminPlayersClient } from "@/components/admin/AdminPlayersClient";

export default async function AdminPlayersPage() {
  const allPlayers = await db.select().from(players).orderBy(players.sortOrder);
  return <AdminPlayersClient players={allPlayers} />;
}
