import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";

export const runtime = "nodejs";

type FlagRow = { boond_id: number; kind: "masque" | "reporte"; until: string | null };

export async function GET() {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  try {
    const rows = await rpc<FlagRow[]>("app_list_flags", { p_token: token });
    return NextResponse.json(rows.map(r => ({ boondId: String(r.boond_id), kind: r.kind, until: r.until })));
  } catch {
    return NextResponse.json({ error: "Impossible de charger les candidats masqués." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const boondId = String(body?.boondId ?? "");
  const kind = body?.kind === "masque" ? "masque" : body?.kind === "reporte" ? "reporte" : null;
  const days = Number(body?.days);
  if (!/^\d{1,12}$/.test(boondId) || !kind || (kind === "reporte" && ![7, 30].includes(days))) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  try {
    const row = await rpc<FlagRow>("app_set_flag", { p_token: token, p_boond_id: Number(boondId), p_kind: kind, p_days: kind === "reporte" ? days : null });
    return NextResponse.json({ boondId, kind: row.kind, until: row.until });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
