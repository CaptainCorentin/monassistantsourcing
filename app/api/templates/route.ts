import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase";
import { parseTemplateInput, toTemplate, type TemplateRow } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await rest<TemplateRow[]>("GET", "message_templates?select=id,name,category,channel,body,sort_order&order=sort_order.asc,name.asc");
    return NextResponse.json(rows.map(toTemplate));
  } catch {
    return NextResponse.json({ error: "Impossible de charger les messages types." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const input = parseTemplateInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Message type invalide." }, { status: 400 });
  try {
    const last = await rest<{ sort_order: number }[]>("GET", "message_templates?select=sort_order&order=sort_order.desc&limit=1");
    const [row] = await rest<TemplateRow[]>("POST", "message_templates", { ...input, sort_order: (last[0]?.sort_order ?? 0) + 1 }, "return=representation");
    return NextResponse.json(toTemplate(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
