// Accès Supabase côté serveur uniquement, via l'API REST et la clé service_role.
// Les tables ont RLS activé sans policy : les clés publiques n'y ont aucun accès.
import "server-only";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export class SupabaseError extends Error {}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseError("Supabase n'est pas configuré.");
  return { url: url.replace(/\/$/, ""), key };
}

export async function rest<T>(method: Method, path: string, body?: unknown, prefer?: string): Promise<T> {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  if (!res.ok) throw new SupabaseError(`Supabase ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
