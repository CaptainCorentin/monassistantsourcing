import "server-only";
import { rest } from "./supabase";

export const N8N_URL = process.env.N8N_WEBHOOK_URL || "https://wefiit.app.n8n.cloud/webhook/vivier-boond-search";

// Clé du webhook : variable Vercel en priorité, sinon table app_config (lisible par le seul serveur).
export async function webhookKey(): Promise<string | null> {
  if (process.env.N8N_WEBHOOK_KEY) return process.env.N8N_WEBHOOK_KEY;
  try {
    const rows = await rest<{ value: string }[]>("GET", "app_config?select=value&key=eq.n8n_webhook_key");
    return rows[0]?.value || null;
  } catch {
    return null;
  }
}
