// Maps platform key → icon filename in /public/socialmedia/
export const SOCIAL_ICON: Record<string, string> = {
  instagram: "/socialmedia/instagram.png",
  tiktok:    "/socialmedia/tiktok.png",
  kick:      "/socialmedia/kick.png",
  youtube:   "/socialmedia/youtube.png",
  x:         "/socialmedia/x.png",
  twitter:   "/socialmedia/x.png",
  twitch:    "/socialmedia/twitch.png",
  github:    "/socialmedia/github.png",
  linkedin:  "/socialmedia/linkedn.png",
};

export const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok:    "TikTok",
  kick:      "Kick",
  youtube:   "YouTube",
  x:         "X / Twitter",
  twitter:   "X / Twitter",
  twitch:    "Twitch",
  github:    "GitHub",
  linkedin:  "LinkedIn",
  discord:   "Discord",
  whatsapp:  "WhatsApp",
};

// Community invite platforms — shown in CommunitySection, filtered OUT of Footer
export const COMMUNITY_PLATFORMS = ["discord", "whatsapp"] as const;
export type CommunityPlatform = (typeof COMMUNITY_PLATFORMS)[number];
