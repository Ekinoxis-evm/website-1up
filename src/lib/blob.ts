import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados" | "site" | "tournaments" | "tournament-prizes";

// M-A5.3: pending comprobante paths are namespaced by an 8-char hash of the
// uploader's privyUserId. Exported so callers can verify that a body-supplied
// `pendingPath` actually belongs to the caller before attaching it to an order.
export function userPathPrefix(privyUserId: string): string {
  return crypto.createHash("md5").update(privyUserId).digest("hex").slice(0, 8);
}

// M-A5.2: magic-byte sniff for comprobante uploads. The client-declared
// `file.type` is trusted by `formData()` parsers but can be lied about; we
// re-verify against the actual file header. Returns the canonical MIME or null.
export async function sniffComprobanteMime(
  file: File,
): Promise<"image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return "image/png";
  // WebP: "RIFF????WEBP"
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // PDF: "%PDF"
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  return null;
}

export async function uploadImage(
  file: File,
  folder: ImageFolder,
  entityId?: number | string,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  // Entity uploads use no extension — same path regardless of file type,
  // so upsert always replaces the old file with zero orphans.
  // Creates park under pending/ with a timestamp until the DB record exists.
  const path = entityId
    ? `${folder}/${entityId}/cover`
    : `${folder}/pending/${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadComprobante(
  file: File,
  privyUserId: string,
): Promise<{ path: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `pending/${userPathPrefix(privyUserId)}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("comprobantes")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  return { path };
}

// M-A5.3: refuse to move a pending object that doesn't belong to the caller.
// Previously a client could submit any `pending/...` path (e.g., guessed
// from another user's hash prefix) and attach it to their own order.
export class ComprobantePathError extends Error {}

export async function moveComprobanteToOrder(
  pendingPath: string,
  orderId: number,
  ext: string,
  callerPrivyUserId: string,
): Promise<string> {
  const expectedPrefix = `pending/${userPathPrefix(callerPrivyUserId)}-`;
  if (!pendingPath.startsWith(expectedPrefix)) {
    throw new ComprobantePathError("Comprobante path does not belong to caller.");
  }

  const finalPath = `${orderId}/receipt.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("comprobantes")
    .move(pendingPath, finalPath);

  if (error) throw new Error(error.message);

  return finalPath;
}

// Returns a 1-hour signed URL for admin access to a private comprobante.
// Legacy records store a full public URL (https://…) — those are returned as-is.
export async function getComprobanteSignedUrl(
  pathOrUrl: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const { data, error } = await supabaseAdmin.storage
    .from("comprobantes")
    .createSignedUrl(pathOrUrl, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}
