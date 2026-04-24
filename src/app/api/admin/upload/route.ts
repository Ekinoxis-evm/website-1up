import { NextRequest, NextResponse } from "next/server";
import { uploadImage, type ImageFolder } from "@/lib/blob";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";

const ALLOWED_FOLDERS = ["players", "courses", "games", "categories", "floors", "masters", "aliados"] as const;
type Folder = typeof ALLOWED_FOLDERS[number];

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = formData.get("folder") as string;
  const entityIdRaw = formData.get("entityId") as string | null;
  const entityId = entityIdRaw ? Number(entityIdRaw) : undefined;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "archivo requerido" }, { status: 400 });
  }
  if (!folder || !ALLOWED_FOLDERS.includes(folder as Folder)) {
    return NextResponse.json({ error: "folder inválido" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx 5MB)" }, { status: 400 });
  }

  const url = await uploadImage(file, folder as ImageFolder, entityId);
  return NextResponse.json({ url }, { status: 201 });
}
