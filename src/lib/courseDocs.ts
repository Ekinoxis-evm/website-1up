import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "course-docs";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/markdown",
]);

const MAX_BYTES = 26_214_400; // 25 MB

export function validateCourseDoc(mimeType: string, sizeBytes: number) {
  if (!ALLOWED_MIME.has(mimeType)) throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
  if (sizeBytes > MAX_BYTES) throw new Error("El archivo supera el límite de 25 MB");
}

export function pendingDocPath(courseId: number, filename: string): string {
  const slug = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `courses/${courseId}/sessions/pending/${Date.now()}-${slug}`;
}

export function finalDocPath(courseId: number, sessionId: number, filename: string): string {
  const slug = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `courses/${courseId}/sessions/${sessionId}/${Date.now()}-${slug}`;
}

export async function uploadCourseDoc(
  body: ArrayBuffer,
  mimeType: string,
  path: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function moveCourseDoc(fromPath: string, toPath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).move(fromPath, toPath);
  if (error) throw new Error(`Storage move failed: ${error.message}`);
}

export async function deleteCourseDoc(path: string): Promise<void> {
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}

export async function getCourseDocSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new Error("Could not generate signed URL");
  return data.signedUrl;
}
