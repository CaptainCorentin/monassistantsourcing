import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import { isUuid, parseCampaignInput, saveArgs, toCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const unauthorized = () => NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });

export async function PUT(req: Request, { params }: Ctx) {
  const token = await currentToken();
  if (!token) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const input = parseCampaignInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Campagne invalide." }, { status: 400 });
  try {
    const row = await rpc<Record<string, unknown> | null>("app_save_campaign", saveArgs(token, id, input));
    if (!row?.id) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    return NextResponse.json(toCampaign(row));
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}

// Suppression = archivage.
export async function DELETE(_req: Request, { params }: Ctx) {
  const token = await currentToken();
  if (!token) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  try {
    await rpc("app_archive_campaign", { p_token: token, p_id: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 502 });
  }
}
