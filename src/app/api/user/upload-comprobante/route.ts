import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/privy";
import { uploadComprobante, sniffComprobanteMime } from "@/lib/blob";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext))
    return NextResponse.json({ error: "Extensión no permitida (jpg, png, webp, pdf)" }, { status: 400 });

  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 400 });

  // M-A5.2: magic-byte sniff. The browser-set `file.type` and the
  // extension-based check above are both client-controllable; only the file
  // header is authoritative. Reject anything that doesn't look like a real
  // JPG/PNG/WebP/PDF.
  const sniffed = await sniffComprobanteMime(file);
  if (!sniffed) {
    return NextResponse.json(
      { error: "El archivo no parece ser un JPG/PNG/WebP/PDF válido." },
      { status: 400 },
    );
  }
  if (sniffed !== file.type) {
    return NextResponse.json(
      { error: "El tipo declarado del archivo no coincide con su contenido." },
      { status: 400 },
    );
  }

  try {
    const { path } = await uploadComprobante(file, claims.userId);
    return NextResponse.json({ path });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
