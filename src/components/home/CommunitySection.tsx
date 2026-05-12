import { supabase } from "@/lib/supabase";
import { SOCIAL_ICON, COMMUNITY_PLATFORMS } from "@/lib/socialIcons";

const PLATFORM_META: Record<string, { label: string; accent: string; tagline: string }> = {
  discord: {
    label:   "Discord",
    accent:  "bg-[#5865F2]",
    tagline: "Chatea, coordina partidas y conecta con la comunidad.",
  },
  whatsapp: {
    label:   "WhatsApp",
    accent:  "bg-[#25D366]",
    tagline: "Grupos de torneos, noticias y actualizaciones al instante.",
  },
};

export async function CommunitySection() {
  const { data: links } = await supabase
    .from("social_links")
    .select("id, platform, url")
    .eq("is_active", true)
    .not("url", "is", null)
    .in("platform", [...COMMUNITY_PLATFORMS])
    .order("sort_order");

  if (!links?.length) return null;

  return (
    <section className="px-8 md:px-16 py-20 bg-surface-container-low">
      {/* Heading */}
      <div className="mb-10">
        <div className="inline-block bg-tertiary px-4 py-1 mb-4 skew-fix">
          <span className="text-on-tertiary font-black italic skew-content block text-sm tracking-widest font-headline">
            COMUNIDAD
          </span>
        </div>
        <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter leading-none mb-2">
          ÚNETE A NUESTRA <span className="text-tertiary">COMUNIDAD</span>
        </h2>
        <div className="h-1 w-20 bg-tertiary" />
        <p className="font-body text-sm text-on-surface-variant mt-4 max-w-md">
          Sé parte de la primera comunidad de esports profesional de Colombia.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {links.map((link) => {
          const meta = PLATFORM_META[link.platform];
          if (!meta) return null;
          return (
            <a
              key={link.id}
              href={link.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 p-6 bg-surface-container hover:bg-surface-container-high transition-colors border-l-4 border-tertiary"
            >
              <div className={`${meta.accent} p-3 shrink-0 flex items-center justify-center`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SOCIAL_ICON[link.platform]}
                  alt={meta.label}
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-headline font-black text-lg uppercase tracking-tight text-on-surface group-hover:text-tertiary transition-colors">
                  {meta.label}
                </span>
                <span className="font-body text-xs text-on-surface-variant leading-relaxed">
                  {meta.tagline}
                </span>
                <span className="font-headline font-bold text-xs uppercase tracking-widest text-tertiary mt-1">
                  UNIRSE →
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
