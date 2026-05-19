import { NextRequest, NextResponse } from "next/server";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { validateCourseDoc, pendingDocPath, uploadCourseDoc } from "@/lib/courseDocs";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const courseId = Number(form.get("courseId"));

  if (!file || !courseId) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  try {
    validateCourseDoc(file.type, file.size);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const path = pendingDocPath(courseId, file.name);
  const buffer = await file.arrayBuffer();

  try {
    await uploadCourseDoc(buffer, file.type, path);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ path, mimeType: file.type, sizeBytes: file.size, label: file.name });
}
