import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase";
import { safeEqual } from "@/lib/session";
import { N8N_URL, webhookKey } from "@/lib/n8n";

export const runtime = "nodejs";

// Contrôle de santé du déploiement, sans aucune donnée candidat.
// Protégé par la clé N8N (en-tête X-Health-Key) : sans elle, réponse 404 comme si la route n'existait pas.
export async function GET(req: Request) {
  const key = await webhookKey();
  const given = req.headers.get("x-health-key") || "";
  if (!key || !safeEqual(given, key)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = !!process.env.APP_PASSWORD && process.env.APP_PASSWORD.length >= 12
    && !!process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32;

  let supabase = "ok";
  let templates = 0;
  try {
    const rows = await rest<{ id: string }[]>("GET", "message_templates?select=id");
    templates = rows.length;
  } catch {
    supabase = "erreur";
  }

  let n8n = "ok";
  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Vivier-Key": key },
      body: JSON.stringify({ ping: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.pong !== true) n8n = `erreur ${res.status}`;
  } catch {
    n8n = "injoignable";
  }

  return NextResponse.json({ session, supabase, templates, n8n, keySource: process.env.N8N_WEBHOOK_KEY ? "vercel" : "supabase" });
}
