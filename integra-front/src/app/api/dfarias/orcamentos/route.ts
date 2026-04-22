import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/dfarias/orcamentos`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: 'Erro no servidor backend' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro GET Dfarias:', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/dfarias/orcamentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
        return NextResponse.json({ error: 'Erro ao salvar no backend' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro POST Dfarias:', error);
    return NextResponse.json({ error: 'Erro de conexão ao salvar' }, { status: 500 });
  }
}
