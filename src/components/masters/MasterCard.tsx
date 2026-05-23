import Image from "next/image";
import type { Master } from "@/types/database.types";
import { SOCIAL_ICON } from "@/lib/socialIcons";

const SOCIAL_LINKS: { key: keyof Master; platform: string }[] = [
  { key: "instagram_url", platform: "instagram" },
  { key: "tiktok_url",    platform: "tiktok"    },
  { key: "youtube_url",   platform: "youtube"   },
  { key: "twitter_url",   platform: "twitter"   },
  { key: "kick_url",      platform: "kick"      },
  { key: "twitch_url",    platform: "twitch"    },
  { key: "github_url",    platform: "github"    },
  { key: "linkedin_url",  platform: "linkedin"  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Gaming:      "bg-primary-container/20 text-primary",
  Performance: "bg-secondary-container/20 text-secondary",
  Technology:  "bg-tertiary/20 text-tertiary",
  Marketing:   "bg-error/20 text-error",
  Legal:       "bg-outline/20 text-outline",
};

interface Props {
  master: Master;
  courses: { id: number; name: string; category: string }[];
}

export function MasterCard({ master, courses }: Props) {
  return (
    <div className="bg-surface-container border-b-4 border-primary-container flex flex-col">
      {/* Photo */}
      <div className="aspect-square bg-surface-container-high w-full overflow-hidden relative">
        {master.photo_url ? (
          <Image
            src={master.photo_url}
            alt={master.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover"
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
          <p className="font-body text-xs text-outline uppercase tracking-widest mt-1">
            {master.specialty}
          </p>
        )}

        {/* Categories */}
        {(master.categories ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(master.categories ?? []).map((cat) => (
              <span
                key={cat}
                className={`font-headline font-black text-[9px] px-2 py-0.5 uppercase tracking-wider ${CATEGORY_COLORS[cat] ?? "bg-surface-container-high text-outline"}`}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Topics */}
        {((master.topics as string[] | null) ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {((master.topics as string[] | null) ?? []).map((t) => (
              <span
                key={t}
                className="bg-surface-container-high text-on-surface/50 font-headline text-[9px] px-2 py-0.5 uppercase tracking-wider"
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
          // M-A1.1: was `border-t border-surface-container-highest` — Rule 2 forbids
          // 1px dividers. Background tint + extra top padding gives the same visual cue.
          <div className="mt-4 -mx-4 px-4 pt-4 bg-surface-container-highest/40">
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
          {SOCIAL_LINKS.map(({ key, platform }) =>
            master[key] ? (
              <a
                key={key}
                href={master[key] as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform}
                className="hover:scale-110 transition-transform opacity-70 hover:opacity-100"
              >
                <Image src={SOCIAL_ICON[platform]} alt={platform} width={20} height={20} className="object-contain" />
              </a>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
