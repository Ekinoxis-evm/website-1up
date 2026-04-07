import { supabaseAdmin } from "@/lib/supabase";

export async function uploadImage(
  file: File,
  folder: "players" | "courses" | "games" | "floors" | "masters" | "aliados",
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}
