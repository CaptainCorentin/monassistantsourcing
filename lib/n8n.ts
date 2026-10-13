import "server-only";
import { rpc } from "./supabase";

export const N8N_URL = process.env.N8N_WEBHOOK_URL || "https://wefiit.app.n8n.cloud/webhook/vivier-boond-search";

// Clé du webhook : variable Vercel si présente, sinon Supabase, délivrée à une session valide uniquement.
export async function webhookKey(token: string): Promise<string | null> {
  if (process.env.N8N_WEBHOOK_KEY) return process.env.N8N_WEBHOOK_KEY;
  try {
    return await rpc<string | null>("app_n8n_key", { p_token: token });
  } catch {
    return null;
  }
}
