import { NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { exampleResult } from "@/lib/example";
import { N8N_URL, webhookKey } from "@/lib/n8n";
import { currentToken } from "@/lib/auth";
import type { Candidate, SearchResult } from "@/lib/types";

export const runtime = "nodejs";
// Jusqu'à 300 historiques lus dans Boond : compter 30 à 60 secondes.
export const maxDuration = 120;

const CATEGORIES = new Set(["a_contacter", "a_relancer", "vivier"]);

// Ne garde que les champs attendus : la réponse N8N n'est jamais renvoyée telle quelle au navigateur.
function sanitize(raw: unknown): SearchResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.candidates)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  const candidates: Candidate[] = [];
  for (const c of r.candidates as Record<string, unknown>[]) {
    if (!c || !/^\d+$/.test(String(c.id)) || !CATEGORIES.has(String(c.category))) continue;
    const lc = c.lastContact as Record<string, unknown> | null;
    candidates.push({
      id: String(c.id),
      firstName: str(c.firstName),
      lastName: str(c.lastName),
      title: str(c.title),
      town: str(c.town),
      state: Number(c.state),
      linkedinUrl: typeof c.linkedinUrl === "string" ? c.linkedinUrl.slice(0, 500) : null,
      category: c.category as Candidate["category"],
      reasons: Array.isArray(c.reasons) ? c.reasons.map(String).slice(0, 5) : [],
      nextContactTypeOf: typeof c.nextContactTypeOf === "number" ? c.nextContactTypeOf : null,
      lastContact: lc && typeof lc.typeOf === "number" ? { typeOf: lc.typeOf, date: str(lc.date), byMe: lc.byMe === true } : null,
      eligibleFrom: typeof c.eligibleFrom === "string" ? c.eligibleFrom : null,
      updateDate: typeof c.updateDate === "string" ? c.updateDate : null
    });
  }
  const excluded: Record<string, number> = {};
  if (r.excluded && typeof r.excluded === "object") {
    for (const [k, v] of Object.entries(r.excluded as Record<string, unknown>)) {
      if (/^[a-z0-9_]{1,40}$/.test(k) && typeof v === "number") excluded[k] = v;
    }
  }
  return {
    example: false,
    searchTotal: typeof r.searchTotal === "number" ? r.searchTotal : 0,
    checked: typeof r.checked === "number" ? r.checked : 0,
    contactables: typeof r.contactables === "number" ? r.contactables : undefined,
    candidates,
    excluded
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const params = parseSearchParams(body);
  if (!params) return NextResponse.json({ error: "Paramètres de recherche invalides." }, { status: 400 });

  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const url = N8N_URL;
  const key = await webhookKey(token);
  if (!key) {
    return NextResponse.json({
      ...exampleResult(params.maxChecks),
      notice: "Clé N8N introuvable : données d'exemple affichées."
    });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Vivier-Key": key },
      body: JSON.stringify(params),
      cache: "no-store",
      signal: AbortSignal.timeout(110_000)
    });
    if (res.status === 401) return NextResponse.json({ error: "La clé N8N est refusée. Vérifie N8N_WEBHOOK_KEY." }, { status: 502 });
    if (!res.ok) return NextResponse.json({ error: `N8N a répondu ${res.status}. Réessaie dans un instant.` }, { status: 502 });
    const result = sanitize(await res.json());
    if (!result) return NextResponse.json({ error: "Réponse N8N illisible." }, { status: 502 });
    return NextResponse.json(result);
  } catch (e) {
    const timeout = (e as Error).name === "TimeoutError";
    return NextResponse.json({ error: timeout ? "La recherche a pris trop de temps. Réduis le nombre de candidats vérifiés." : "N8N injoignable." }, { status: 504 });
  }
}
