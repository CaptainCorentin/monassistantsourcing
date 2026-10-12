// Session signée par HMAC, vérifiable dans le middleware (Edge) comme dans les routes (Node).
// Cookie : "<expiration ms>.<signature base64url>". Aucune donnée personnelle dedans.

export const SESSION_COOKIE = "vb_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// Comparaison en temps constant sur des chaînes de même alphabet.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionValue(now = Date.now()): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${await hmac(secret, `v1.${exp}`)}`;
}

export async function isValidSession(value: string | undefined, now = Date.now()): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(secret, `v1.${exp}`));
}

// Compare le mot de passe saisi sans révéler sa longueur ni sa position de divergence.
export async function isValidPassword(input: string): Promise<boolean> {
  const secret = getSecret();
  const expected = process.env.APP_PASSWORD;
  if (!secret || !expected || expected.length < 12) return false;
  const [a, b] = await Promise.all([hmac(secret, `pw.${input}`), hmac(secret, `pw.${expected}`)]);
  return safeEqual(a, b);
}
