// Privy OAuth (Google) always returns the user to the URL where login was
// initiated, and that URL must be an EXACT match against the allowlist in the
// Privy dashboard (Configuration > App settings > Advanced). Public pages with
// dynamic slugs (/torneos/[slug], /academia/[courseId]) can never be
// allowlisted, so login must never be triggered inline on them.
//
// Instead we send logged-out users to app.1upesports.org/login — the single
// allowlisted login page — carrying the page they came from in ?redirect. The
// Privy session cookie is shared across every *.1upesports.org subdomain, so
// they return to the public site already authenticated.

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "https://app.1upesports.org";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://1upesports.org";

export function goToLogin(): void {
  // Use the apex BASE_URL origin (not window.location.origin, which is the www
  // host) so app/login's same-origin redirect allowlist accepts it.
  const returnTo =
    BASE_URL + window.location.pathname + window.location.search + window.location.hash;
  window.location.href = `${APP_URL}/login?redirect=${encodeURIComponent(returnTo)}`;
}
