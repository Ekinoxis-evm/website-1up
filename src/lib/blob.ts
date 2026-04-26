import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados" | "site";

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
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop() || "jpg";
  const hash = crypto.createHash("md5").update(privyUserId).digest("hex").slice(0, 8);
  const path = `comprobantes/pending/${hash}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function moveComprobanteToOrder(
  pendingPath: string,
  orderId: number,
  ext: string,
): Promise<string> {
  const finalPath = `comprobantes/${orderId}/receipt.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("images")
    .move(pendingPath, finalPath);

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(finalPath);
  return data.publicUrl;
}
