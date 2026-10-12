import { NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { exampleResult } from "@/lib/example";

export const runtime = "nodejs";

// Jalon 2 : renvoie des données d'exemple. Jalon 4 : appelle le workflow N8N côté serveur.
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const params = parseSearchParams(body);
  if (!params) return NextResponse.json({ error: "Paramètres de recherche invalides." }, { status: 400 });
  return NextResponse.json(exampleResult(params.limit));
}
