import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ boondId: string }> }) {
  const { boondId } = await params;
  if (!/^\d{1,12}$/.test(boondId)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  try {
    await rest("DELETE", `candidate_flags?boond_id=eq.${boondId}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Annulation impossible." }, { status: 502 });
  }
}
