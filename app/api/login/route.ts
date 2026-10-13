import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";
import { rpc, RpcError } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  let token: string | null = null;
  try {
    token = await rpc<string | null>("app_login", { p_password: password });
  } catch (e) {
    if (e instanceof RpcError && e.message.includes("trop_de_tentatives")) {
      return NextResponse.json({ error: "Trop de tentatives. Réessaie dans 15 minutes." }, { status: 429 });
    }
    return NextResponse.json({ error: "Service de connexion injoignable." }, { status: 502 });
  }
  if (!token) {
    await new Promise(r => setTimeout(r, 800));
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  });
  return res;
}
