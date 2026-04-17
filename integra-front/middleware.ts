import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host");

  // 1. Lógica Isolada do Subdomínio
  if (hostname === "clube.eletrofarias.app.br") {
    // Reescreve a URL silenciosamente para a rota /clube
    if (!url.pathname.startsWith("/clube")) {
      url.pathname = `/clube${req.nextUrl.pathname}`;
    }

    // O return imediato garante que o subdomínio ignore completamente 
    // o restante das regras (como a verificação de token abaixo).
    return NextResponse.rewrite(url);
  }

  // 2. Lógica de Autenticação (Aplica-se apenas ao domínio principal)
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
    // Captura todas as rotas para que o hostname possa ser avaliado na raiz,
    // ignorando apenas arquivos estáticos e rotas internas de API.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};