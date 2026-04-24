import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, imageUrl } = await req.json() as { key: string; imageUrl: string };
  if (!key || !imageUrl) return NextResponse.json({ error: "key e imageUrl requeridos" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("site_content")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/gaming-tower");
  revalidatePath("/academia");
  revalidatePath("/admin/site-images");
  return NextResponse.json({ ok: true });
}
