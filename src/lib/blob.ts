import { put } from "@vercel/blob";

export async function uploadImage(
  file: File,
  folder: "players" | "courses" | "games" | "floors",
): Promise<string> {
  const filename = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const blob = await put(filename, file, { access: "public" });
  return blob.url;
}
