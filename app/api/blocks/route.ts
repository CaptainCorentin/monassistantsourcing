import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import { currentToken } from "@/lib/auth";
import type { Block } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET() {
  const token = await currentToken();
  if (!token) return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  try {
    const rows = await rpc<Block[]>("app_list_blocks", { p_token: token });
    return NextResponse.json(rows.map(({ code, kind, label, body }) => ({ code, kind, label, body })));
  } catch {
    return NextResponse.json({ error: "Impossible de charger la banque de messages." }, { status: 502 });
  }
}
