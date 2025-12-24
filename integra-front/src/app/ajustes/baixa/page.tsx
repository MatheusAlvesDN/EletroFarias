'use client';

import { useEffect, useMemo, useState } from 'react';

type Solicitacao = {
  userRequest: string;
  codProd: number;
  createAt: string; // ISO do backend (DateTime)
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;

  try {
    return JSON.stringify(err);
  } catch {
    return 'Erro inesperado';
  }
}

export default function SolicitacoesPage() {
  const [data, setData] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    // mais recentes primeiro
    return [...data].sort(
      (a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime(),
    );
  }, [data]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const token =
          typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        const resp = await fetch(`${API_URL}/sync/getSolicitacao`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(
            `Erro ao carregar solicitações (${resp.status}): ${txt}`,
          );
        }

        const json: unknown = await resp.json();
        const list = Array.isArray(json) ? (json as Solicitacao[]) : [];
        setData(list);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Solicitações</h1>
        <p className="text-sm text-gray-500">
          Listagem do endpoint <code>/sync/getSolicitacao</code>
        </p>
      </div>

      {loading && (
        <div className="rounded border p-4 text-sm">Carregando...</div>
      )}

      {!loading && error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="rounded border p-4 text-sm">
          Nenhuma solicitação encontrada.
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">CODPROD</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => (
                <tr key={`${s.userRequest}-${s.codProd}-${s.createAt}-${idx}`}>
                  <td className="border-t px-4 py-3">{s.userRequest}</td>
                  <td className="border-t px-4 py-3">{s.codProd}</td>
                  <td className="border-t px-4 py-3">
                    {new Date(s.createAt).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
