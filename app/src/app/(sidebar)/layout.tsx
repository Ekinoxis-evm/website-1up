import { TopAppBar } from "@/components/layout/TopAppBar";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Footer } from "@/components/layout/Footer";

/** Public pages WITH SideNavBar — Gaming Tower, Team, Academia */
export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopAppBar />
      <div className="flex">
        <SideNavBar />
        <div className="flex-1 md:ml-56 flex flex-col min-h-[calc(100vh-4rem)]">
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
