import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },             // Supabase Storage (all uploaded images)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },  // Google avatars
      { protocol: "https", hostname: "images.unsplash.com" },        // GamesGallery static fallbacks
    ],
  },
};

export default nextConfig;
