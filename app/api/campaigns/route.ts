import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import { parseCampaignInput, saveArgs, toCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

const unauthorized = () => NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });

export async function GET() {
  const token = await currentToken();
  if (!token) return unauthorized();
  try {
    const rows = await rpc<Record<string, unknown>[]>("app_list_campaigns", { p_token: token });
    return NextResponse.json(rows.map(toCampaign));
  } catch {
    return NextResponse.json({ error: "Impossible de charger les campagnes." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = await currentToken();
  if (!token) return unauthorized();
  const input = parseCampaignInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Campagne invalide." }, { status: 400 });
  try {
    const row = await rpc<Record<string, unknown>>("app_save_campaign", saveArgs(token, null, input));
    return NextResponse.json(toCampaign(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
