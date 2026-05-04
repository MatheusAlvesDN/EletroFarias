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
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  codParc: string | null;
  createdAt: string;
};

export default function CarteiraVendedorPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_BASE}/crm/clientes?minha=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resp.ok) throw new Error('Falha ao carregar carteira');
      const data = await resp.json();
      setClientes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.documento && c.documento.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clientes, searchTerm]);

  return (
    <DashboardLayout subtitle="Minha Carteira de Clientes">
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in-up">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Users className="w-8 h-8" />
              </div>
              Minha Carteira
            </h1>
            <p className="text-slate-500 mt-1 ml-14">
              Gerencie seus {clientes.length} clientes vinculados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRefreshing(true); fetchClientes(); }}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => router.push('/crm/lead/novo')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-200 transition-all active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Clientes</p>
            <p className="text-3xl font-black text-slate-900">{clientes.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Com CodParc</p>
            <p className="text-3xl font-black text-emerald-600">
              {clientes.filter(c => !!c.codParc).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Sem Documento</p>
            <p className="text-3xl font-black text-amber-500">
              {clientes.filter(c => !c.documento).length}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por nome, documento ou e-mail..."
            className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento / Cód.</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        <p className="text-slate-500 font-bold">Carregando seus clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Users className="w-16 h-16 text-slate-300" />
                        <p className="text-xl font-bold text-slate-400">Nenhum cliente encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200 shadow-sm">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{cliente.nome}</p>
                            <p className="text-xs text-slate-400 font-mono">{cliente.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          {cliente.email ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {cliente.email}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Sem e-mail</span>
                          )}
                          {cliente.telefone ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {cliente.telefone}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Sem telefone</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700">{cliente.documento || '---'}</p>
                          {cliente.codParc && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              Sankhya: {cliente.codParc}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-600">
                          {new Date(cliente.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => router.push(`/crm/lead/novo?clienteId=${cliente.id}`)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Novo Lead/Pedido para este cliente"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => router.push(`/crm/clientes/${cliente.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ver Detalhes"
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
