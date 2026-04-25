import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCookieToken } from "@/lib/privy";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppBottomNav } from "@/components/app/AppBottomNav";

export const metadata = { title: "1UP App" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

export default async function AppProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;

  const claims = await verifyCookieToken(token);
  if (!claims) redirect(`${APP_URL}/login`);

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      <AppSidebar />
      <main className="flex-1 ml-0 md:ml-56 p-6 md:p-10 pb-24 md:pb-10">{children}</main>
      <AppBottomNav />
    </div>
  );
}
