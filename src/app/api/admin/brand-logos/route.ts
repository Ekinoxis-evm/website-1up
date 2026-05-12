import { NextResponse } from "next/server";

// brand_logos table was consolidated into aliados (show_in_banner = true)
export function GET()    { return NextResponse.json({ error: "Moved to /api/admin/aliados" }, { status: 410 }); }
export function POST()   { return NextResponse.json({ error: "Moved to /api/admin/aliados" }, { status: 410 }); }
export function PUT()    { return NextResponse.json({ error: "Moved to /api/admin/aliados" }, { status: 410 }); }
export function DELETE() { return NextResponse.json({ error: "Moved to /api/admin/aliados" }, { status: 410 }); }
