import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados" | "site" | "tournaments" | "tournament-prizes";

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
  const hash = crypto.createHash("md5").update(privyUserId).digest("hex").slice(0, 8);
  const path = `pending/${hash}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("comprobantes")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  return { path };
}

export async function moveComprobanteToOrder(
  pendingPath: string,
  orderId: number,
  ext: string,
): Promise<string> {
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
