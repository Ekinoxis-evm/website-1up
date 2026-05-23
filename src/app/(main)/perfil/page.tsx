// H-10: /perfil is documented in CLAUDE.md as redirecting to the app subdomain —
// the authenticated user shell lives at app.1upesports.org. The previous version
// re-rendered a full auth UI here (stale duplicate of the (protected) shell),
// which is both a source of UX confusion and a stale code path. Server-side
// redirect: no client JS, no flash, no indexable auth page.

import { redirect, permanentRedirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1upesports.org";

export const metadata = {
  title:   "Mi Perfil — 1UP Gaming Tower",
  robots:  { index: false, follow: false },
};

export default function PerfilRoute() {
  // 308 in production (permanent) so search engines drop the old URL; 307 in dev
  // so iteration on the app subdomain doesn't sticky-cache the redirect.
  if (process.env.NODE_ENV === "production") permanentRedirect(APP_URL);
  redirect(APP_URL);
}
