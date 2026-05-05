'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  UserPlus, 
  ExternalLink,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type Vendedor = {
  id: string;
  email: string;
  role: string;
  codVend: string | null;
  crmTags: string[];
};

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  codParc: string | null;
  vendedorId: string | null;
  vendedor?: Vendedor | null;
  createdAt: string;
};

export default function CarteiraGeralPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<string | 'UNASSIGNED' | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const [clientesResp, vendedoresResp] = await Promise.all([
        fetch(`${API_BASE}/crm/carteira/geral`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/crm/vendedores`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!clientesResp.ok || !vendedoresResp.ok) throw new Error('Falha ao carregar dados');
      
      const [clientesData, vendedoresData] = await Promise.all([
        clientesResp.json(),
        vendedoresResp.json()
      ]);

      setClientes(clientesData);
      setVendedores(vendedoresData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSeller = async (clienteId: string, vendedorId: string) => {
    try {
      setAssigningId(clienteId);
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_BASE}/crm/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vendedorId: vendedorId || null })
      });

      if (!resp.ok) throw new Error('Falha ao atribuir');
      
      // Atualiza localmente para feedback instantâneo
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, vendedorId: vendedorId || null, vendedor: vendedores.find(v => v.id === vendedorId) || null } : c
      ));

    } catch (err) {
      alert('Erro ao atribuir vendedor');
    } finally {
      setAssigningId(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: clientes.length,
      assigned: clientes.filter(c => !!c.vendedorId).length,
      unassigned: clientes.filter(c => !c.vendedorId).length
    };
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    let list = clientes;

    if (selectedSellerId === 'UNASSIGNED') {
      list = list.filter(c => !c.vendedorId);
    } else if (selectedSellerId !== 'ALL') {
      list = list.filter(c => c.vendedorId === selectedSellerId);
    }

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.nome.toLowerCase().includes(low) ||
        (c.documento && c.documento.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(low)) ||
        (c.vendedor?.email.toLowerCase().includes(low))
      );
    }

    return list;
  }, [clientes, selectedSellerId, searchTerm]);

  return (
    <DashboardLayout subtitle="Carteira Geral de Clientes">
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in-up">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                <Briefcase className="w-8 h-8" />
              </div>
              Carteira Geral
            </h1>
            <p className="text-slate-500 mt-1 ml-14">
              Visão completa das carteiras por vendedor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Geral</p>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Atribuídos</p>
            <p className="text-3xl font-black text-emerald-600">{stats.assigned}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Sem Vendedor</p>
            <p className="text-3xl font-black text-amber-500">{stats.unassigned}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-indigo-500">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Vendedores</p>
            <p className="text-3xl font-black text-indigo-600">{vendedores.length}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Filters */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-8">
              <h3 className="font-bold text-slate-800 mb-4 px-2">Filtrar por Carteira</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedSellerId('ALL')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selectedSellerId === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Todos os Clientes
                  </div>
                  <span>{stats.total}</span>
                </button>
                <button
                  onClick={() => setSelectedSellerId('UNASSIGNED')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    selectedSellerId === 'UNASSIGNED' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserMinus className="w-4 h-4" />
                    Sem Vendedor
                  </div>
                  <span>{stats.unassigned}</span>
                </button>
                
                <div className="pt-4 pb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Vendedores</p>
                </div>

                {vendedores.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedSellerId(v.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedSellerId === v.id ? 'bg-indigo-50 text-indigo-700 border-indigo-100 border' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-0.5 truncate">
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck className={`w-4 h-4 ${selectedSellerId === v.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="truncate">{v.email.split('@')[0]}</span>
                      </div>
                      {v.crmTags?.length > 0 && (
                        <div className="flex gap-1 ml-6">
                          {v.crmTags.map(tag => (
                            <span key={tag} className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded uppercase font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] opacity-60">
                      {clientes.filter(c => c.vendedorId === v.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar por nome, documento, vendedor..."
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-500 font-bold">Carregando carteira geral...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredClientes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-40">
                            <Users className="w-16 h-16 text-slate-300" />
                            <p className="text-xl font-bold text-slate-400">Nenhum cliente nesta seleção</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClientes.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900">{cliente.nome}</p>
                              {cliente.codParc && (
                                <p className="text-[10px] text-slate-400 font-mono">Cód: {cliente.codParc}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {cliente.vendedor ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                  {cliente.vendedor.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-sm">
                                  <p className="font-bold text-slate-700">{cliente.vendedor.email.split('@')[0]}</p>
                                  <p className="text-[10px] text-slate-400">{cliente.vendedor.role}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                SEM VENDEDOR
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {cliente.documento || '---'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {assigningId === cliente.id ? (
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                              ) : (
                                <div className="relative group/select">
                                  <select 
                                    value={cliente.vendedorId || ''}
                                    onChange={(e) => handleAssignSeller(cliente.id, e.target.value)}
                                    className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg border-none appearance-none transition-all cursor-pointer outline-none"
                                    title="Atribuir Vendedor"
                                  >
                                    <option value="">LIVRE</option>
                                    {vendedores.map(v => (
                                      <option key={v.id} value={v.id}>{v.email.split('@')[0].toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              
                              <button 
                                onClick={() => router.push(`/crm/clientes/${cliente.id}`)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Editar Cadastro"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </DashboardLayout>
  );
}
