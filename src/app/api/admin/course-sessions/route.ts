import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken, resolveUserEmail } from "@/lib/privy";
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { moveCourseDoc, finalDocPath, deleteCourseDoc } from "@/lib/courseDocs";

async function checkAdmin(req: NextRequest) {
  const claims = await verifyToken(req.headers.get("authorization"));
  if (!claims) return false;
  return await isAdmin(await resolveUserEmail(claims.userId));
}

async function courseIdFromModule(moduleId: number): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("course_modules")
    .select("course_id")
    .eq("id", moduleId)
    .single();
  return data?.course_id ?? null;
}

function invalidate(courseId: number) {
  revalidatePath(`/app/academia/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    moduleId,
    title,
    description,
    videoUid,
    durationMinutes,
    isPublished,
    sortOrder,
    pendingDocs = [],
    links = [],
  }: {
    moduleId: number;
    title: string;
    description?: string;
    videoUid?: string;
    durationMinutes?: number;
    isPublished?: boolean;
    sortOrder?: number;
    pendingDocs: { path: string; label: string; mimeType: string; sizeBytes: number }[];
    links: { label: string; url: string; sortOrder?: number }[];
  } = body;

  const courseId = await courseIdFromModule(moduleId);
  if (!courseId) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("course_sessions")
    .insert({
      module_id:        moduleId,
      title,
      description:      description ?? null,
      video_uid:        videoUid ?? null,
      duration_minutes: durationMinutes ?? null,
      is_published:     isPublished ?? false,
      sort_order:       sortOrder ?? 0,
    })
    .select()
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message ?? "Insert failed" }, { status: 500 });
  }

  // Move pending docs to final path and insert DB rows
  const docInserts: { session_id: number; label: string; storage_path: string; mime_type: string; size_bytes: number; sort_order: number }[] = [];
  for (let i = 0; i < pendingDocs.length; i++) {
    const doc = pendingDocs[i];
    const filename = doc.path.split("/").pop() ?? `doc-${i}`;
    const finalPath = finalDocPath(courseId, session.id, filename);
    try {
      await moveCourseDoc(doc.path, finalPath);
      docInserts.push({
        session_id:   session.id,
        label:        doc.label,
        storage_path: finalPath,
        mime_type:    doc.mimeType,
        size_bytes:   doc.sizeBytes,
        sort_order:   i,
      });
    } catch {
      // Storage move failed — skip this doc but don't fail the whole request
    }
  }
  if (docInserts.length > 0) {
    await supabaseAdmin.from("course_session_documents").insert(docInserts);
  }

  // Insert links
  if (links.length > 0) {
    const linkInserts = links.map((l, i) => ({
      session_id: session.id,
      label:      l.label,
      url:        l.url,
      sort_order: l.sortOrder ?? i,
    }));
    await supabaseAdmin.from("course_session_links").insert(linkInserts);
  }

  invalidate(courseId);
  return NextResponse.json(session);
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    id,
    moduleId,
    title,
    description,
    videoUid,
    durationMinutes,
    isPublished,
    sortOrder,
    pendingDocs = [],
    removedDocIds = [],
  }: {
    id: number;
    moduleId?: number;
    title?: string;
    description?: string;
    videoUid?: string | null;
    durationMinutes?: number | null;
    isPublished?: boolean;
    sortOrder?: number;
    pendingDocs: { path: string; label: string; mimeType: string; sizeBytes: number }[];
    removedDocIds: number[];
  } = body;

  // Resolve courseId: prefer moduleId from body, otherwise look up from session
  let courseId: number | null = null;
  if (moduleId) {
    courseId = await courseIdFromModule(moduleId);
  } else {
    const { data: s } = await supabaseAdmin
      .from("course_sessions")
      .select("module_id, course_modules!inner(course_id)")
      .eq("id", id)
      .single();
    if (s) {
      const mod = s.course_modules as unknown as { course_id: number };
      courseId = mod.course_id;
    }
  }
  if (!courseId) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const updatePayload: Record<string, unknown> = {};
  if (moduleId !== undefined)        updatePayload.module_id = moduleId;
  if (title !== undefined)           updatePayload.title = title;
  if (description !== undefined)     updatePayload.description = description ?? null;
  if (videoUid !== undefined)        updatePayload.video_uid = videoUid ?? null;
  if (durationMinutes !== undefined) updatePayload.duration_minutes = durationMinutes ?? null;
  if (isPublished !== undefined)     updatePayload.is_published = isPublished;
  if (sortOrder !== undefined)       updatePayload.sort_order = sortOrder;

  const { data: session, error: updateErr } = await supabaseAdmin
    .from("course_sessions")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (updateErr || !session) {
    return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });
  }

  // Delete removed docs from storage + DB
  if (removedDocIds.length > 0) {
    const { data: toDelete } = await supabaseAdmin
      .from("course_session_documents")
      .select("id, storage_path")
      .in("id", removedDocIds);
    if (toDelete) {
      await Promise.all(toDelete.map(d => deleteCourseDoc(d.storage_path)));
      await supabaseAdmin.from("course_session_documents").delete().in("id", removedDocIds);
    }
  }

  // Move new pending docs to final path and insert DB rows
  if (pendingDocs.length > 0) {
    const { count } = await supabaseAdmin
      .from("course_session_documents")
      .select("id", { count: "exact", head: true })
      .eq("session_id", id);
    const baseOrder = count ?? 0;

    const docInserts: { session_id: number; label: string; storage_path: string; mime_type: string; size_bytes: number; sort_order: number }[] = [];
    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i];
      const filename = doc.path.split("/").pop() ?? `doc-${i}`;
      const finalPath = finalDocPath(courseId, id, filename);
      try {
        await moveCourseDoc(doc.path, finalPath);
        docInserts.push({
          session_id:   id,
          label:        doc.label,
          storage_path: finalPath,
          mime_type:    doc.mimeType,
          size_bytes:   doc.sizeBytes,
          sort_order:   baseOrder + i,
        });
      } catch {
        // Storage move failed — skip
      }
    }
    if (docInserts.length > 0) {
      await supabaseAdmin.from("course_session_documents").insert(docInserts);
    }
  }

  invalidate(courseId);
  return NextResponse.json(session);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();

  // Resolve courseId before deleting
  const { data: sessionRow } = await supabaseAdmin
    .from("course_sessions")
    .select("module_id, course_modules!inner(course_id)")
    .eq("id", id)
    .single();

  const courseId = sessionRow
    ? (sessionRow.course_modules as unknown as { course_id: number }).course_id
    : null;

  // Delete storage objects for all documents in this session
  const { data: docs } = await supabaseAdmin
    .from("course_session_documents")
    .select("storage_path")
    .eq("session_id", id);

  if (docs && docs.length > 0) {
    await Promise.all(docs.map(d => deleteCourseDoc(d.storage_path)));
  }

  // Delete session (cascade removes session_documents + session_links rows)
  await supabaseAdmin.from("course_sessions").delete().eq("id", id);

  if (courseId) invalidate(courseId);
  return NextResponse.json({ ok: true });
}
