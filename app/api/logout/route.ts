import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";

export async function POST() {
  const token = await currentToken();
  if (token) await rpc("app_logout", { p_token: token }).catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
