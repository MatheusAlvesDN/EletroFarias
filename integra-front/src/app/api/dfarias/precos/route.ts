import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ProductPayload = {
  precoVenda?: unknown;
  preco?: unknown;
  valor?: unknown;
  price?: unknown;
};

const pickUnitPrice = (payload: ProductPayload): unknown =>
  payload?.precoVenda ?? payload?.preco ?? payload?.valor ?? payload?.price ?? 0;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { codes?: string[] };
    const codes = Array.isArray(body?.codes) ? body.codes.filter((code) => /^\d+$/.test(String(code))) : [];

    if (codes.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const authHeader = req.headers.get('authorization');
    const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    const pairs = await Promise.all(
      codes.map(async (code) => {
        try {
          const response = await fetch(`${BACKEND_URL}/crm/sankhya/product/${encodeURIComponent(code)}`, {
            headers,
            cache: 'no-store',
          });

          if (!response.ok) {
            return [code, 0] as const;
          }

          const data = (await response.json()) as ProductPayload;
          return [code, pickUnitPrice(data)] as const;
        } catch {
          return [code, 0] as const;
        }
      }),
    );

    return NextResponse.json({
      prices: Object.fromEntries(pairs),
    });
  } catch (error) {
    console.error('Erro POST /api/dfarias/precos:', error);
    return NextResponse.json({ error: 'Erro ao buscar preços dos produtos.' }, { status: 500 });
  }
}
