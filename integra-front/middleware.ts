import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 1. Estratégia de Captura de Host específica para Render / Proxies
  let rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.hostname;

  // Se o Render/Cloudflare passar múltiplos hosts (lista), pegamos apenas o primeiro
  if (rawHost.includes(",")) {
    rawHost = rawHost.split(",")[0].trim();
  }

  // Remove a porta do Render (ex: :10000 ou :443) para garantir a comparação exata
  const hostname = rawHost.split(":")[0];

  // ==========================================
  // DEBUG OBRIGATÓRIO: Olhe os logs no painel do Render!
  console.log(`[Middleware] Host limpo: "${hostname}" | Path: "${url.pathname}"`);
  // ==========================================

  // 2. Lógica Isolada do Subdomínio
  if (hostname === "clube.eletrofarias.app.br") {
    if (!url.pathname.startsWith("/clube")) {
      const pathSuffix = url.pathname === "/" ? "" : url.pathname;
      url.pathname = `/clube${pathSuffix}`;

      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 3. Lógica de Autenticação (Domínio Principal)
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