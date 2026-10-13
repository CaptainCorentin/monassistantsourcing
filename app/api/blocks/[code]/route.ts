import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import type { Block } from "@/lib/messages";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

// Seul le texte d'un bloc existant change : pas de création ni de suppression.
export async function PUT(req: Request, { params }: Ctx) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { code } = await params;
  if (!/^[A-Z0-9-]{1,20}$/.test(code)) return NextResponse.json({ error: "Bloc invalide." }, { status: 400 });
  const input = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const body = typeof input?.body === "string" ? input.body : "";
  if (!body.trim() || body.length > 2000) return NextResponse.json({ error: "Texte vide ou trop long (2 000 caractères max)." }, { status: 400 });
  try {
    const row = await rpc<Block | null>("app_save_block", { p_token: token, p_code: code, p_body: body });
    if (!row?.code) return NextResponse.json({ error: "Bloc introuvable." }, { status: 404 });
    return NextResponse.json({ code: row.code, kind: row.kind, label: row.label, body: row.body });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
