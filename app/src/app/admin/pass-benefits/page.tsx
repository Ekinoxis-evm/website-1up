import { db } from "@/db";
import { passBenefits } from "@/db/schema";
import { AdminPassBenefitsClient } from "@/components/admin/AdminPassBenefitsClient";

export default async function AdminPassBenefitsPage() {
  const benefits = await db.select().from(passBenefits).orderBy(passBenefits.sortOrder);
  return <AdminPassBenefitsClient benefits={benefits} />;
}
