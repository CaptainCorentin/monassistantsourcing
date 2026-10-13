// Session : jeton aléatoire de 256 bits émis par Supabase (app_login), dont seule l'empreinte est stockée.
import { rpc } from "./supabase";

export const SESSION_COOKIE = "vb_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const looksLikeToken = (t: string | undefined): t is string => !!t && /^[0-9a-f]{64}$/.test(t);

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!looksLikeToken(token)) return false;
  try {
    return await rpc<boolean>("app_session_ok", { p_token: token });
  } catch {
    return false;
  }
}

// Comparaison en temps constant.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
