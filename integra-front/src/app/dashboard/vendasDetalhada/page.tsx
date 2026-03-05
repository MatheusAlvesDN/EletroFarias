"use client";

import React, { useMemo, useState } from "react";
import "./VendasDetalhado.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

const url = API_BASE ? `${API_BASE}/sankhya/notas-detalhadas` : `/sankhya/notas-detalhadas`;

// Novo retorno do backend (agregado)
type RetornoPorCstNovo = {
  cst: string;
  qtdNotas: number;
  totalItens: number;
};

export default function VendasDetalhado() {
  // Inicializa as datas com o mês atual
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
  const diaAtual = hoje.toISOString().split("T")[0];

  const [filtros, setFiltros] = useState({
    codEmp: 1,
    dtIni: primeiroDia,
    dtFim: diaAtual,
    contrib: true,
    nContrib: true,
    cfops: "", // Ex: "5102,5405"
  });

  const [dados, setDados] = useState<RetornoPorCstNovo[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const consultarNotas = async () => {
    setCarregando(true);
    setErro("");
    setDados(null);

    const queryParams = new URLSearchParams({
      codEmp: String(filtros.codEmp),
      dtIni: filtros.dtIni,
      dtFim: filtros.dtFim,
      contrib: String(filtros.contrib),
      nContrib: String(filtros.nContrib),
    });

    if (filtros.cfops) {
      queryParams.append("cfops", filtros.cfops.replace(/\s/g, ""));
    }

    const urlComParams = `${url}?${queryParams.toString()}`;

    try {
      const response = await fetch(urlComParams, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Falha ao buscar dados");

      const result = (await response.json()) as any[];

      // Normaliza: aceita tanto snake/upper quanto camel
      const normalizado: RetornoPorCstNovo[] = Array.isArray(result)
        ? result.map((r: any) => ({
            cst: String(r.cst ?? r.CST ?? "Desconhecido"),
            qtdNotas: Number(r.qtdNotas ?? r.QTD_NOTAS ?? 0) || 0,
            totalItens: Number(r.totalItens ?? r.TOTAL_ITENS ?? 0) || 0,
          }))
        : [];

      setDados(normalizado);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar os totais por CST. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

  // Totais gerais (rodapé)
  const totaisGerais = useMemo(() => {
    const base = { qtdNotas: 0, totalItens: 0 };
    if (!dados?.length) return base;

    for (const r of dados) {
      base.qtdNotas += Number(r.qtdNotas) || 0; // soma de QTD_NOTAS por CST (pode contar repetido entre CSTs)
      base.totalItens += Number(r.totalItens) || 0;
    }
    return base;
  }, [dados]);

  return (
    <div className="container">
      <h2>Totais por CST</h2>

      {/* Filtros */}
      <div className="filtros-card">
        <div className="filtros-linha">
          <div className="form-group">
            <label htmlFor="codEmp">Cód. Empresa:</label>
            <input
              type="number"
              id="codEmp"
              name="codEmp"
              value={filtros.codEmp}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dtIni">Data Inicial:</label>
            <input
              type="date"
              id="dtIni"
              name="dtIni"
              value={filtros.dtIni}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="dtFim">Data Final:</label>
            <input
              type="date"
              id="dtFim"
              name="dtFim"
              value={filtros.dtFim}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cfops">CFOPs (separados por vírgula):</label>
            <input
              type="text"
              id="cfops"
              name="cfops"
              value={filtros.cfops}
              onChange={handleChange}
              placeholder="Ex: 5102, 5405"
              className="form-control"
            />
          </div>
        </div>

        <div className="filtros-linha checkboxes-linha">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="contrib"
              name="contrib"
              checked={filtros.contrib}
              onChange={handleChange}
            />
            <label htmlFor="contrib">Contribuinte</label>
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="nContrib"
              name="nContrib"
              checked={filtros.nContrib}
              onChange={handleChange}
            />
            <label htmlFor="nContrib">Não Contribuinte</label>
          </div>

          <div className="btn-container">
            <button onClick={consultarNotas} disabled={carregando} className="btn-primary">
              {carregando ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && <div className="alert-error">{erro}</div>}

      {/* Tabela */}
      {dados && !carregando && (
        <div className="tabela-container">
          <table className="tabela-notas">
            <thead>
              <tr>
                <th>CST</th>
                <th>Qtd. Notas</th>
                <th>Total Itens</th>
              </tr>
            </thead>

            <tbody>
              {dados.length > 0 ? (
                <>
                  {dados.map((row, index) => (
                    <tr key={`${row.cst}-${index}`}>
                      <td>{row.cst}</td>
                      <td className="texto-dir">{row.qtdNotas}</td>
                      <td className="texto-dir">{formatarMoeda(row.totalItens)}</td>
                    </tr>
                  ))}

                  {/* Rodapé com totais */}
                  <tr>
                    <td style={{ fontWeight: 700 }}>TOTAL</td>
                    <td className="texto-dir" style={{ fontWeight: 700 }}>
                      {totaisGerais.qtdNotas}
                    </td>
                    <td className="texto-dir" style={{ fontWeight: 700 }}>
                      {formatarMoeda(totaisGerais.totalItens)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="sem-dados">
                    Nenhum resultado encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            Obs.: “Qtd. Notas” é a contagem de notas por CST (se uma mesma nota tiver mais de um CST, ela entra em mais de
            um grupo).
          </div>
        </div>
      )}
    </div>
  );
}