import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/print/orcamento-dfarias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {
          error: 'Erro ao gerar orçamento no backend',
          detalhe: errorText || null,
        },
        { status: res.status },
      );
    }

    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="orcamento_dfarias.pdf"',
      },
    });
  } catch (error) {
    console.error('Erro POST print/orcamento-dfarias:', error);
    return NextResponse.json(
      { error: 'Erro de conexão ao gerar orçamento' },
      { status: 500 },
    );
  }
}
