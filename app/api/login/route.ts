import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionValue, isValidPassword } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!(await isValidPassword(password))) {
    // Ralentit les essais en série.
    await new Promise(r => setTimeout(r, 800));
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const value = await createSessionValue();
  if (!value) return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  });
  return res;
}
