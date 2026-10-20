import { NextResponse } from "next/server";
import { N8N_ACTION_URL, webhookKey } from "@/lib/n8n";
import { currentToken } from "@/lib/auth";

export const runtime = "nodejs";

// « Envoyer sur LinkedIn » : crée l'action de contact (131 / 15 / 16) dans Boond via N8N.
// dryRun : N8N prépare l'action sans l'écrire (contrôle en ligne).
export async function POST(req: Request) {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const candidateId = String(body?.candidateId ?? "");
  const typeOf = Number(body?.typeOf);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4000) : "";
  if (!/^\d{1,9}$/.test(candidateId) || ![131, 15, 16].includes(typeOf) || !text) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const key = await webhookKey(token);
  if (!key) return NextResponse.json({ error: "Clé N8N introuvable : action non créée." }, { status: 502 });
  try {
    const res = await fetch(N8N_ACTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Vivier-Key": key },
      body: JSON.stringify({ candidateId, typeOf, text, dryRun: body?.dryRun === true }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000)
    });
    const data = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok || !data || data.ok !== true) {
      return NextResponse.json({ error: typeof data?.error === "string" ? data.error : "Action non créée dans Boond." }, { status: 502 });
    }
    return NextResponse.json({
      created: typeof data.actionId === "string",
      actionId: typeof data.actionId === "string" ? data.actionId : null,
      duplicate: data.duplicate === true,
      dryRun: data.dryRun === true,
      preview: data.dryRun === true ? data.preview ?? null : undefined
    });
  } catch {
    return NextResponse.json({ error: "N8N injoignable : action non créée." }, { status: 504 });
  }
}
