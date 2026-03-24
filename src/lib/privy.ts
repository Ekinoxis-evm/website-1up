import { PrivyClient } from "@privy-io/server-auth";

export const privyServer = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

/**
 * Verify a Privy access token from an Authorization header.
 * Returns userId + appId claims on success, null on failure.
 */
export async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return await privyServer.verifyAuthToken(authHeader.replace("Bearer ", ""));
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
    return await privyServer.verifyAuthToken(token);
  } catch {
    return null;
  }
}
