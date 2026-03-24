import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCookieToken } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { privyServer } from "@/lib/privy";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — 1UP Gaming Tower" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;

  const claims = await verifyCookieToken(token);
  if (!claims) redirect("/");

  let email: string | undefined;
  try {
    const user = await privyServer.getUser(claims.userId);
    email = user.email?.address;
  } catch {
    redirect("/");
  }

  if (!isAdmin(email)) redirect("/");

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-56 p-6 md:p-10">{children}</main>
    </div>
  );
}
