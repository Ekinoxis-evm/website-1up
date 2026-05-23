import { SignJWT } from "jose";
import { createPrivateKey } from "node:crypto";

const ACCOUNT_ID    = process.env.CF_STREAM_ACCOUNT_ID!;
const API_TOKEN     = process.env.CF_STREAM_API_TOKEN!;
const KEY_ID        = process.env.CF_STREAM_KEY_ID!;
const PEM_B64       = process.env.CF_STREAM_PEM!;
const CUSTOMER_CODE = process.env.CF_STREAM_CUSTOMER_CODE!;

export function streamEmbedUrl(token: string) {
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${token}/iframe`;
}

// M-A6.3: optional `clientIp` ties the token to a specific source IP via CF
// Stream's `accessRules` ("ip.src" allow + "any" block). Without it the JWT
// was a 1-hour shareable bearer — anyone who got the URL out of the iframe
// could stream. With it, the token only plays from the IP that minted it.
// The mobile-network-IP-change trade-off is acceptable (token expires in 1h
// anyway; a refresh re-mints from the new IP).
type SignOpts = { clientIp?: string };

export async function signStreamToken(videoUid: string, opts: SignOpts = {}): Promise<string> {
  const pem = Buffer.from(PEM_B64, "base64").toString("utf-8");
  // Cloudflare's signing key is PKCS#1 ("BEGIN RSA PRIVATE KEY"); createPrivateKey
  // auto-detects PKCS#1 vs PKCS#8, unlike jose's importPKCS8 which rejects PKCS#1.
  const privateKey = createPrivateKey(pem);

  const payload: Record<string, unknown> = { kid: KEY_ID };
  if (opts.clientIp && opts.clientIp !== "unknown") {
    payload.accessRules = [
      { type: "ip.src",      ip: [`${opts.clientIp}/32`], action: "allow" },
      { type: "any",                                       action: "block" },
    ];
  }

  // Cloudflare requires `kid` in the JWT payload (not only the header) to
  // resolve the signing key — without it the token is rejected with 401.
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setSubject(videoUid)
    .setExpirationTime("1h")
    .setNotBefore(Math.floor(Date.now() / 1000) - 5)
    .sign(privateKey);
}

export async function createUploadUrl(filename: string): Promise<{ uid: string; uploadURL: string }> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 7200,
        requireSignedURLs: true,
        meta: { name: filename },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`CF Stream direct_upload failed: ${res.status}`, body);
    throw new Error(`CF Stream upload URL error: ${res.status} — ${body}`);
  }
  const json = await res.json();
  return { uid: json.result.uid, uploadURL: json.result.uploadURL };
}
