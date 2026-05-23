// Shared avatar component used across the platform — public bracket
// participants, Hall of Fame, TopAppBar, admin lists, etc.
//
// Renders the user's uploaded avatar from `user_profiles.avatar_url` when
// present; falls back to deterministic initials on a hash-colored gradient
// when null. The same input always produces the same gradient — so a user
// without an avatar always shows up the same way across every surface.

import Image from "next/image";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface Props {
  src?:   string | null;
  name?:  string | null;       // full display name (e.g. "John Doe")
  alt?:   string;              // overrides name for screen-reader purposes
  size?:  AvatarSize;          // default "md"
  square?: boolean;            // default false (rounded-full). square=true for neo-brutalist sharp corners.
  className?: string;          // extra wrapper classes
}

// Tailwind size presets. Numeric sizes match the next/image width/height.
const SIZES: Record<AvatarSize, { box: string; px: number; text: string }> = {
  xs:  { box: "w-6 h-6",    px: 24,  text: "text-[10px]" },
  sm:  { box: "w-8 h-8",    px: 32,  text: "text-xs"     },
  md:  { box: "w-10 h-10",  px: 40,  text: "text-sm"     },
  lg:  { box: "w-14 h-14",  px: 56,  text: "text-base"   },
  xl:  { box: "w-20 h-20",  px: 80,  text: "text-xl"     },
  "2xl": { box: "w-32 h-32", px: 128, text: "text-3xl"   },
};

// Six brand-adjacent gradients. The user's name hash maps to one of these.
// Picked so they're distinguishable at all sizes and contrast well with white text.
const GRADIENTS = [
  "bg-gradient-to-br from-primary-container to-primary",
  "bg-gradient-to-br from-secondary-container to-secondary",
  "bg-gradient-to-br from-tertiary to-secondary-container",
  "bg-gradient-to-br from-primary to-tertiary",
  "bg-gradient-to-br from-secondary to-primary-container",
  "bg-gradient-to-br from-primary-container to-tertiary",
] as const;

function hashIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  alt,
  size = "md",
  square = false,
  className = "",
}: Props) {
  const s = SIZES[size];
  const radius = square ? "" : "rounded-full";

  if (src) {
    return (
      <div className={`relative ${s.box} ${radius} overflow-hidden bg-surface-container-high ${className}`}>
        <Image
          src={src}
          alt={alt ?? name ?? "Avatar"}
          fill
          sizes={`${s.px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  // Initials fallback — deterministic gradient + uppercase initials in white.
  const key = (name ?? alt ?? "").trim() || "?";
  const gradient = GRADIENTS[hashIndex(key, GRADIENTS.length)];
  const initials = initialsOf(name ?? alt);

  return (
    <div
      role="img"
      aria-label={alt ?? name ?? "Avatar"}
      className={`flex items-center justify-center ${s.box} ${radius} ${gradient} text-white font-headline font-black ${s.text} tracking-tight select-none ${className}`}
    >
      {initials}
    </div>
  );
}
