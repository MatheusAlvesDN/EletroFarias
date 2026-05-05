import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(req: Request, { params }: { params: { leadId: string } }) {
  try {
    const leadId = params.leadId;
    const res = await fetch(`${BACKEND_URL}/dfarias/orcamentos/lead/${leadId}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
        return NextResponse.json({ error: 'Erro no servidor backend' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro GET Dfarias by Lead:', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}
