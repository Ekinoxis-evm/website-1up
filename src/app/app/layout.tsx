import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCookieToken } from "@/lib/privy";
import { AppSidebar } from "@/components/app/AppSidebar";

export const metadata = { title: "1UP App" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;

  const claims = await verifyCookieToken(token);
  if (!claims) {
    // Redirect to main site login
    redirect(process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org");
  }

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      <AppSidebar />
      <main className="flex-1 ml-0 md:ml-56 p-6 md:p-10">{children}</main>
    </div>
  );
}
