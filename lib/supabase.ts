// Accès Supabase par la seule clé publique (publishable), conçue pour être exposée.
// Les tables sont fermées (RLS sans policy) : tout passe par des fonctions SQL `app_*`
// qui exigent un jeton de session valide (supabase/migrations/0003_auth_rpc.sql).
// Aucune variable d'environnement n'est requise ; SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY peuvent surcharger.

const URL = (process.env.SUPABASE_URL || "https://lbrdtyxlkfeiaveuinux.supabase.co").replace(/\/$/, "");
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_qwD0XAzlI6Ng2fOL3Mqj5g_Zbb6OAFo";

export class RpcError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store"
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new RpcError(String(data?.message || `Supabase ${res.status}`), res.status, data?.code);
  return data as T;
}
