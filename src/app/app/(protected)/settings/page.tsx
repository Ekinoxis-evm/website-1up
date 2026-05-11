import { redirect } from "next/navigation";

export const metadata = { title: "Ajustes — 1UP App" };

export default function AppSettingsPage() {
  redirect("/app/ajustes");
}
