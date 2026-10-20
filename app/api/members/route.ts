import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import { isUuid } from "@/lib/campaigns";

export const runtime = "nodejs";

// Candidat « passé » vers une autre campagne (campaignId), ou traité (campaignId null).
// Seul l'id Boond est stocké.
export async function POST(req: Request) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const boondId = String(body?.boondId ?? "");
  const campaignId = body?.campaignId ?? null;
  if (!/^\d{1,12}$/.test(boondId) || (campaignId !== null && !isUuid(campaignId))) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  try {
    if (campaignId) await rpc("app_assign_campaign", { p_token: token, p_boond_id: Number(boondId), p_campaign: campaignId });
    else await rpc("app_member_done", { p_token: token, p_boond_id: Number(boondId) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
