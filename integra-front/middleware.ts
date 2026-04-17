import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 1. Captura o Hostname de forma mais segura (lida com proxies e portas)
  const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.hostname;

  // Remove a porta (se houver) para garantir a comparação exata
  const hostname = hostHeader.split(":")[0];

  // ==========================================
  // DEBUG: Descomente a linha abaixo e olhe o terminal do seu servidor
  // console.log("Acessando host:", hostname, "| Path:", url.pathname);
  // ==========================================

  // 2. Lógica Isolada do Subdomínio
  if (hostname === "clube.eletrofarias.app.br") {
    // Reescreve a URL silenciosamente para a rota /clube
    if (!url.pathname.startsWith("/clube")) {
      url.pathname = `/clube${req.nextUrl.pathname}`;
    }

    return NextResponse.rewrite(url);
  }

  // 3. Lógica de Autenticação (Aplica-se apenas ao domínio principal)
  const token = req.cookies.get("authToken")?.value;
  const protectedPaths = ["/inicio", "/sankhya"];

  const isProtected = protectedPaths.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !token) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};