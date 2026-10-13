import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase";
import { isUuid, parseTemplateInput, toTemplate, type TemplateRow } from "@/lib/templates";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const input = parseTemplateInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Message type invalide." }, { status: 400 });
  try {
    const rows = await rest<TemplateRow[]>("PATCH", `message_templates?id=eq.${id}`, input, "return=representation");
    if (!rows.length) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    return NextResponse.json(toTemplate(rows[0]));
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  try {
    await rest("DELETE", `message_templates?id=eq.${id}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 502 });
  }
}
