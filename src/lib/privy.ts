import { PrivyClient } from "@privy-io/server-auth";

export const privyServer = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

// M-A6.4: defense-in-depth. `privyServer.verifyAuthToken` already validates
// signature + expiry against this app's keys, but we add an explicit `appId`
// claim check so a token signed by a different Privy app (mis-pointed
// production key, cross-tenant attack) is rejected even if its signature
// happened to validate. The Privy SDK returns the claim as `appId`.
// Env var read per-call so tests can stub it without re-importing the module.
function assertAppId<T extends { appId?: string }>(claims: T): T | null {
  return claims.appId && claims.appId === process.env.NEXT_PUBLIC_PRIVY_APP_ID ? claims : null;
}

/**
 * Verify a Privy access token from an Authorization header.
 * Returns userId + appId claims on success, null on failure.
 */
export async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const claims = await privyServer.verifyAuthToken(authHeader.replace("Bearer ", ""));
    return assertAppId(claims);
  } catch {
    return null;
  }
}

/**
 * Verify using the privy-token cookie value directly.
 */
export async function verifyCookieToken(token: string | undefined) {
  if (!token) return null;
  try {
    const claims = await privyServer.verifyAuthToken(token);
    return assertAppId(claims);
  } catch {
    return null;
  }
}

/**
 * Resolve the best available email for a Privy user.
 * Covers email-method logins, Google OAuth, and Discord OAuth.
 */
export async function resolveUserEmail(userId: string): Promise<string | undefined> {
  const user = await privyServer.getUser(userId).catch(() => null);
  if (!user) return undefined;
  return (
    user.email?.address ??
    user.google?.email ??
    user.discord?.email ??
    undefined
  );
}
