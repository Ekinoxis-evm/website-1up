import { SignJWT, importPKCS8 } from "jose";

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
  const privateKey = await importPKCS8(pem, "RS256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setSubject(videoUid)
    .setExpirationTime("1h")
    .setNotBefore("-5s")
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
  if (!res.ok) throw new Error(`CF Stream upload URL error: ${res.status}`);
  const json = await res.json();
  return { uid: json.result.uid, uploadURL: json.result.uploadURL };
}
