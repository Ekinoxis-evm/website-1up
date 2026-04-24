import { supabaseAdmin } from "@/lib/supabase";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados";

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
