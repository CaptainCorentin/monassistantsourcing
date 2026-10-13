import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, looksLikeToken } from "./session";

// Jeton de la requête courante (le middleware a déjà vérifié sa validité).
export async function currentToken(): Promise<string | null> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  return looksLikeToken(t) ? t : null;
}
