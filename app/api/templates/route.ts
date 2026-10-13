import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import { parseTemplateInput, toTemplate, type TemplateRow } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  try {
    const rows = await rpc<TemplateRow[]>("app_list_templates", { p_token: token });
    return NextResponse.json(rows.map(toTemplate));
  } catch {
    return NextResponse.json({ error: "Impossible de charger les messages types." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const input = parseTemplateInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Message type invalide." }, { status: 400 });
  try {
    const row = await rpc<TemplateRow>("app_save_template", {
      p_token: token, p_id: null, p_name: input.name, p_category: input.category, p_channel: input.channel, p_body: input.body
    });
    return NextResponse.json(toTemplate(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
