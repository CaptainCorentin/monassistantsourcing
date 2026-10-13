import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

// Tout est fermé par défaut : seules la page de connexion et sa route sont publiques.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Écritures : JSON uniquement, et depuis la webapp elle-même (en plus du cookie SameSite=strict).
  if (pathname.startsWith("/api/") && req.method !== "GET") {
    const origin = req.headers.get("origin");
    const json = (req.headers.get("content-type") || "").startsWith("application/json");
    if ((origin && origin !== req.nextUrl.origin) || (req.method !== "DELETE" && !json)) {
      return NextResponse.json({ error: "Requête refusée." }, { status: 403 });
    }
  }

  // /api/health se protège elle-même par la clé N8N (voir la route).
  if (pathname === "/login" || pathname === "/api/login" || pathname === "/api/health") return NextResponse.next();

  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Session expirée. Reconnecte-toi." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
