import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados" | "site" | "tournaments" | "tournament-prizes" | "users";

// M-A5.3: pending comprobante paths are namespaced by an 8-char hash of the
// uploader's privyUserId. Exported so callers can verify that a body-supplied
// `pendingPath` actually belongs to the caller before attaching it to an order.
export function userPathPrefix(privyUserId: string): string {
  return crypto.createHash("md5").update(privyUserId).digest("hex").slice(0, 8);
}

// Magic-byte sniffers live in `@/lib/imageSniff` so they can be unit-tested
// without pulling in the Supabase client (which requires env vars at import
// time). Re-exported here for backward compatibility with existing call sites.
export { sniffAvatarMime, sniffComprobanteMime } from "@/lib/imageSniff";

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

// `folderPrefix` namespaces order tables that share the bucket — e.g.
// tournament entry orders use "entry-" so entry order #37 never collides with
// pass/token order #37 at `37/receipt.*`.
export async function moveComprobanteToOrder(
  pendingPath: string,
  orderId: number,
  ext: string,
  callerPrivyUserId: string,
  folderPrefix = "",
): Promise<string> {
  const expectedPrefix = `pending/${userPathPrefix(callerPrivyUserId)}-`;
  if (!pendingPath.startsWith(expectedPrefix)) {
    throw new ComprobantePathError("Comprobante path does not belong to caller.");
  }

  const finalPath = `${folderPrefix}${orderId}/receipt.${ext}`;

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
