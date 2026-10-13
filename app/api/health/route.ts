import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { N8N_URL } from "@/lib/n8n";

export const runtime = "nodejs";

// Contrôle de santé du déploiement, sans aucune donnée candidat ni secret.
// Toujours : Supabase joignable avec la clé publique.
// Avec l'en-tête X-Health-Key (clé N8N) : ping réel du workflow N8N, qui valide lui-même la clé.
export async function GET(req: Request) {
  let supabase = "ok";
  try {
    await rpc<boolean>("app_session_ok", { p_token: "0".repeat(64) });
  } catch {
    supabase = "erreur";
  }

  const given = req.headers.get("x-health-key");
  if (!given || !/^[0-9a-f]{64}$/.test(given)) return NextResponse.json({ supabase });

  let n8n = "ok";
  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Vivier-Key": given },
      body: JSON.stringify({ ping: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.pong !== true) n8n = `erreur ${res.status}`;
  } catch {
    n8n = "injoignable";
  }
  return NextResponse.json({ supabase, n8n });
}
