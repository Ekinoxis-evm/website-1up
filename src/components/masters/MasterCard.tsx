import type { Master } from "@/types/database.types";

const SOCIAL_LINKS = [
  { key: "instagram_url" as const, icon: "photo_camera",  label: "Instagram" },
  { key: "tiktok_url"    as const, icon: "video_library", label: "TikTok"    },
  { key: "twitter_url"   as const, icon: "tag",           label: "Twitter"   },
  { key: "youtube_url"   as const, icon: "play_circle",   label: "YouTube"   },
  { key: "linkedin_url"  as const, icon: "work",          label: "LinkedIn"  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Gaming:      "bg-primary-container/20 text-primary",
  Performance: "bg-secondary-container/20 text-secondary",
  Technology:  "bg-tertiary/20 text-tertiary",
};

interface Props {
  master: Master;
  courses: { id: number; name: string; category: string }[];
}

export function MasterCard({ master, courses }: Props) {
  return (
    <div className="bg-surface-container border-b-4 border-primary-container flex flex-col">
      {/* Photo */}
      <div className="aspect-square bg-surface-container-high w-full overflow-hidden">
        {master.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={master.photo_url}
            alt={master.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[5rem] text-surface-container-highest"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              school
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tighter leading-tight">
          {master.name}
        </h3>
        {master.specialty && (
          <p className="font-body text-xs text-primary uppercase tracking-widest mt-1">
            {master.specialty}
          </p>
        )}

        {/* Topics */}
        {(master.topics ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {(master.topics ?? []).map((t) => (
              <span
                key={t}
                className="bg-secondary-container/20 text-secondary font-headline text-[9px] px-2 py-0.5 uppercase tracking-wider"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {master.bio && (
          <p className="font-body text-sm text-on-surface/60 mt-3 leading-relaxed">
            {master.bio}
          </p>
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-container-highest">
            <p className="font-headline font-black text-[9px] uppercase tracking-widest text-outline mb-2">
              Cursos
            </p>
            <div className="flex flex-col gap-1.5">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span
                    className={`font-headline font-black text-[8px] px-1.5 py-0.5 uppercase tracking-wider shrink-0 ${CATEGORY_COLORS[c.category] ?? "bg-surface-container-high text-outline"}`}
                  >
                    {c.category}
                  </span>
                  <span className="font-body text-xs text-on-surface/70 truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social links */}
        <div className="flex gap-3 mt-4 pt-4">
          {SOCIAL_LINKS.map(({ key, icon, label }) =>
            master[key] ? (
              <a
                key={key}
                href={master[key] as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-outline hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-base">{icon}</span>
              </a>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
