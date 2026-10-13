import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";

export const runtime = "nodejs";

// Annule un masquage ou un report.
export async function DELETE(_req: Request, { params }: { params: Promise<{ boondId: string }> }) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { boondId } = await params;
  if (!/^\d{1,12}$/.test(boondId)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  try {
    await rpc("app_clear_flag", { p_token: token, p_boond_id: Number(boondId) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Annulation impossible." }, { status: 502 });
  }
}
