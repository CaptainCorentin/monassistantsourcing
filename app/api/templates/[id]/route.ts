import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import { isUuid, parseTemplateInput, toTemplate, type TemplateRow } from "@/lib/templates";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const input = parseTemplateInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Message type invalide." }, { status: 400 });
  try {
    const row = await rpc<TemplateRow | null>("app_save_template", {
      p_token: token, p_id: id, p_name: input.name, p_category: input.category, p_channel: input.channel, p_body: input.body
    });
    if (!row?.id) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    return NextResponse.json(toTemplate(row));
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}

// Suppression = archivage (le message disparaît de la liste, la ligne reste en base).
export async function DELETE(_req: Request, { params }: Ctx) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  try {
    await rpc("app_archive_template", { p_token: token, p_id: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 502 });
  }
}
