"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getAuthHeaders, getToken } from "@/lib/auth";

type Produto = {
  CODPROD?: number | null;
  DESCRICAO?: string | null;
  LOCALIZACAO?: string | null;
  // adicione outros campos que você usa…
};

export default function SankhyaPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // exige login
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
    }
  }, [router]);

  const GET_URL = useMemo(
    () => (pid: string) =>
      `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(pid)}`,
    []
  );

  async function buscarProduto(pid: string) {
    setErro(null);
    setProduto(null);

    if (!pid) {
      setErro("Informe um ID/Código para buscar.");
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const resp = await fetch(GET_URL(pid), {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na busca (status ${resp.status})`);
      }
      const data = (await resp.json()) as Produto | null;
      setProduto(data);
    } catch (e: unknown) {
      // @ts-expect-error Abort check
      if (e?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Erro ao buscar produto";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  async function salvarLocalizacao(novaLoc: string) {
    if (!produto?.CODPROD) {
      setErro("Busque um produto primeiro.");
      return;
    }
    setErro(null);
    try {
      setSaving(true);
      const resp = await fetch(`${API_BASE}/sync/updateProductLocation`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: produto.CODPROD,
          localizacao: novaLoc,
        }),
      });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao salvar (status ${resp.status})`);
      }
      // sucesso
      setProduto((p) => (p ? { ...p, LOCALIZACAO: novaLoc } : p));
      alert("Localização atualizada!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      setErro(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>/sankhya (protegido)</h1>

      <section style={{ marginTop: 16 }}>
        <label>
          Código/ID do produto:{" "}
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ex.: 12345"
          />
        </label>
        <button
          style={{ marginLeft: 8 }}
          onClick={() => buscarProduto(id)}
          disabled={loading}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </section>

      {erro && (
        <p style={{ color: "crimson", marginTop: 12 }}>
          <b>Erro:</b> {erro}
        </p>
      )}

      {produto && (
        <section style={{ marginTop: 24 }}>
          <h3>Produto</h3>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 6,
              overflowX: "auto",
            }}
          >
            {JSON.stringify(produto, null, 2)}
          </pre>

          <div style={{ marginTop: 12 }}>
            <label>
              Nova localização:{" "}
              <input
                defaultValue={produto.LOCALIZACAO ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    salvarLocalizacao(v);
                  }
                }}
              />
            </label>
            <button
              style={{ marginLeft: 8 }}
              onClick={() =>
                salvarLocalizacao(
                  (document.querySelector(
                    'input[type="text"]'
                  ) as HTMLInputElement)?.value || ""
                )
              }
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
