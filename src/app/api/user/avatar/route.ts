// Avatar upload / removal for the authenticated user.
//
// POST: multipart with `file` (JPEG / PNG / WebP, ≤ 5 MB). Magic-byte sniffed
// server-side (same hardening as comprobantes — `file.type` is client-set and
// can lie). Stored at `images/users/{user_profile_id}/avatar` (no extension —
// upsert overwrites any prior avatar so the user never accumulates orphans).
// `user_profiles.avatar_url` is updated to the new public URL.
//
// DELETE: clears `avatar_url` and removes the storage object. UI falls back to
// the deterministic initials gradient.

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { supabaseAdmin } from "@/lib/supabase";
import { sniffAvatarMime } from "@/lib/blob";
import { revalidatePath } from "next/cache";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT  = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_BYTES    = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Perfil no encontrado. Completa el onboarding primero." },
      { status: 404 },
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido (jpg, png, webp)" }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Extensión no permitida (jpg, png, webp)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx 5 MB)" }, { status: 400 });
  }

  // Magic-byte sniff — `file.type` is client-set and can lie.
  const sniffed = await sniffAvatarMime(file);
  if (!sniffed) {
    return NextResponse.json(
      { error: "El archivo no parece ser un JPG / PNG / WebP válido." },
      { status: 400 },
    );
  }
  if (sniffed !== file.type) {
    return NextResponse.json(
      { error: "El tipo declarado del archivo no coincide con su contenido." },
      { status: 400 },
    );
  }

  // Path: `users/{user_profile_id}/avatar` (no extension, MIME stored in metadata).
  // Same pattern as other entity uploads — upsert overwrites the old file.
  const path = `users/${profile.id}/avatar`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("images")
    .upload(path, file, { contentType: sniffed, upsert: true });

  if (uploadErr) {
    console.error("[avatar] upload failed:", uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Public URL — `images` bucket is public.
  const { data: urlData } = supabaseAdmin.storage.from("images").getPublicUrl(path);
  // Cache-bust on every upload so the new avatar shows immediately on
  // surfaces that cached the old URL.
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updateErr } = await supabaseAdmin
    .from("user_profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", profile.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Refresh public surfaces that show user avatars.
  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/team");

  return NextResponse.json({ avatarUrl: publicUrl });
}

export async function DELETE(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("privy_user_id", claims.userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });

  const path = `users/${profile.id}/avatar`;
  await supabaseAdmin.storage.from("images").remove([path]).catch(() => null);

  await supabaseAdmin
    .from("user_profiles")
    .update({ avatar_url: null })
    .eq("id", profile.id);

  revalidatePath("/torneos");
  revalidatePath("/torneos/[slug]", "page");
  revalidatePath("/team");

  return NextResponse.json({ ok: true });
}
