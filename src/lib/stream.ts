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

export async function signStreamToken(videoUid: string): Promise<string> {
  const pem = Buffer.from(PEM_B64, "base64").toString("utf-8");
  // Cloudflare's signing key is PKCS#1 ("BEGIN RSA PRIVATE KEY"); createPrivateKey
  // auto-detects PKCS#1 vs PKCS#8, unlike jose's importPKCS8 which rejects PKCS#1.
  const privateKey = createPrivateKey(pem);
  // Cloudflare requires `kid` in the JWT payload (not only the header) to
  // resolve the signing key — without it the token is rejected with 401.
  return new SignJWT({ kid: KEY_ID })
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
