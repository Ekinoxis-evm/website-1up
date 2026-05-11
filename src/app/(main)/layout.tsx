import { TopAppBar } from "@/components/layout/TopAppBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Footer } from "@/components/layout/Footer";
import { PassSuggestionBanner } from "@/components/layout/PassSuggestionBanner";

/** All public pages — TopAppBar + Footer + MobileBottomNav */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopAppBar />
      <main className="pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
      <PassSuggestionBanner />
    </>
  );
}
