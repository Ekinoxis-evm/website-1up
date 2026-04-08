import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SOCIAL_ICON, SOCIAL_LABEL } from "@/lib/socialIcons";

export async function Footer() {
  const { data: socialLinks } = await supabase
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .not("url", "is", null)
    .order("sort_order");

  return (
    <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-8 bg-surface-container-lowest border-t-8 border-primary-container">
      <div className="flex flex-col items-center md:items-start gap-1">
        <span className="text-lg font-black text-primary font-headline">
          1UP GAMING TOWER
        </span>
        <span className="font-body text-xs tracking-widest uppercase text-outline">
          © {new Date().getFullYear()} 1UP GAMING TOWER COLOMBIA
        </span>
        <span className="font-body text-xs text-outline/60">
          1upesports.org
        </span>
      </div>

      {/* Social links */}
      {(socialLinks ?? []).length > 0 && (
        <div className="flex items-center gap-5">
          {(socialLinks ?? []).map((s) => (
            <a
              key={s.id}
              href={s.url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={SOCIAL_LABEL[s.platform] ?? s.platform}
              className="opacity-50 hover:opacity-100 transition-opacity hover:scale-110 transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SOCIAL_ICON[s.platform] ?? `/socialmedia/${s.platform}.png`}
                alt={s.platform}
                className="w-6 h-6 object-contain"
              />
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-6">
        <Link
          href="/admin"
          className="font-body text-xs tracking-widest uppercase text-outline/40 hover:text-outline transition-colors"
        >
          Admin
        </Link>
        <span className="text-tertiary font-black tracking-widest text-xs font-headline">
          LEVEL UP COLOMBIA
        </span>
      </div>
    </footer>
  );
}
