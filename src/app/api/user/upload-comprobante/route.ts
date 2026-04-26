import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { uploadComprobante } from "@/lib/blob";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  if (!ALLOWED_MIME.has(file.type))
    return NextResponse.json({ error: "Tipo de archivo no permitido (jpg, png, webp, pdf)" }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 400 });

  try {
    const result = await uploadComprobante(file, claims.userId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
