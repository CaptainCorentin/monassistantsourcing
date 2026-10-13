import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase";

export const runtime = "nodejs";

type FlagRow = { boond_id: number; kind: "masque" | "reporte"; until: string | null };

// Statuts actifs : masqués, et reportés dont la date n'est pas passée.
export async function GET() {
  try {
    // Valeur entre guillemets : l'horodatage contient des « . » et « : » réservés par PostgREST.
    const or = encodeURIComponent(`(kind.eq.masque,until.gt."${new Date().toISOString()}")`);
    const rows = await rest<FlagRow[]>("GET", `candidate_flags?select=boond_id,kind,until&or=${or}`);
    return NextResponse.json(rows.map(r => ({ boondId: String(r.boond_id), kind: r.kind, until: r.until })));
  } catch {
    return NextResponse.json({ error: "Impossible de charger les candidats masqués." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const boondId = String(body?.boondId ?? "");
  const kind = body?.kind === "masque" ? "masque" : body?.kind === "reporte" ? "reporte" : null;
  const days = Number(body?.days);
  if (!/^\d{1,12}$/.test(boondId) || !kind || (kind === "reporte" && ![7, 30].includes(days))) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const until = kind === "reporte" ? new Date(Date.now() + days * 86400000).toISOString() : null;
  try {
    await rest("POST", "candidate_flags?on_conflict=boond_id", { boond_id: Number(boondId), kind, until }, "resolution=merge-duplicates");
    return NextResponse.json({ boondId, kind, until });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 502 });
  }
}
