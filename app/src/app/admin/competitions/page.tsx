import { db } from "@/db";
import { competitions, players } from "@/db/schema";
import { AdminCompetitionsClient } from "@/components/admin/AdminCompetitionsClient";

export default async function AdminCompetitionsPage() {
  const [allComps, allPlayers] = await Promise.all([
    db.select().from(competitions).orderBy(competitions.year),
    db.select().from(players).orderBy(players.sortOrder),
  ]);
  return <AdminCompetitionsClient competitions={allComps} players={allPlayers} />;
}
