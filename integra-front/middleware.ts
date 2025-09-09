import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Aviso: cookie é mais robusto que localStorage no middleware.
// Se você guarda em localStorage, o middleware não consegue ver.
// Alternativa simples: validar no client e redirecionar.
// Abaixo, deixo um middleware que só bloqueia por query/cookie.
// Se preferir, você pode mover o token para cookie HttpOnly no login.

export function middleware(req: NextRequest) {
  // Exemplo: se você decidir também salvar o token em cookie "authToken"
  const token = req.cookies.get("authToken")?.value;

  const protectedPaths = ["/inicio", "/sankhya"];
  const isProtected = protectedPaths.some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/inicio/:path*", "/sankhya/:path*"],
};
