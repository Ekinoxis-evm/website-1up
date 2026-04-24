import { supabaseAdmin } from "@/lib/supabase";

export type ImageFolder = "players" | "courses" | "games" | "categories" | "floors" | "masters" | "aliados";

export async function uploadImage(
  file: File,
  folder: ImageFolder,
  entityId?: number | string,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  // When the entity ID is known (editing), use a stable path that upserts.
  // When creating (no ID yet), park under pending/ with a timestamp.
  const path = entityId
    ? `${folder}/${entityId}/image.${ext}`
    : `${folder}/pending/${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}
