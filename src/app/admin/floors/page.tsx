import { db } from "@/db";
import { floorInfo } from "@/db/schema";
import { AdminFloorsClient } from "@/components/admin/AdminFloorsClient";

export default async function AdminFloorsPage() {
  const floors = await db.select().from(floorInfo).orderBy(floorInfo.sortOrder);
  return <AdminFloorsClient floors={floors} />;
}
