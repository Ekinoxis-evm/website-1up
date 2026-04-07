import type { Master } from "@/types/database.types";

const SOCIAL_LINKS = [
  { key: "instagram_url" as const, icon: "photo_camera",  label: "Instagram" },
  { key: "tiktok_url"    as const, icon: "video_library", label: "TikTok"    },
  { key: "twitter_url"   as const, icon: "tag",           label: "Twitter"   },
  { key: "youtube_url"   as const, icon: "play_circle",   label: "YouTube"   },
  { key: "linkedin_url"  as const, icon: "work",          label: "LinkedIn"  },
];

export function MasterCard({ master }: { master: Master }) {
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
          <p className="font-body text-sm text-on-surface/60 mt-3 flex-1 leading-relaxed">
            {master.bio}
          </p>
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
