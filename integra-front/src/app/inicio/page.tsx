"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getAuthHeaders, getToken } from "@/lib/auth";

type UserPayload = { userId: string; email: string } | null;

export default function InicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserPayload>(null);
  const [error, setError] = useState<string | null>(null);

  // exige login
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/auth/verify`, {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha na verificação (${resp.status})`);
        }
        const data = (await resp.json()) as { valid: boolean; user: UserPayload };
        setUser(data?.user ?? null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao verificar login";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <main style={{ padding: 24 }}>Carregando…</main>;
  if (error) return <main style={{ padding: 24, color: "crimson" }}>{error}</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Início (protegido)</h1>
      {user ? (
        <p>Autenticado como <b>{user.email}</b></p>
      ) : (
        <p>Não foi possível obter o usuário.</p>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Exemplo de chamada protegida</h2>
        <button
          onClick={async () => {
            try {
              const resp = await fetch(`${API_BASE}/sync/ping`, {
                method: "GET",
                headers: getAuthHeaders(),
                cache: "no-store",
              });
              alert(`Status: ${resp.status}\nBody: ${await resp.text()}`);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
        >
          Testar /sync/ping
        </button>
      </section>
    </main>
  );
}
