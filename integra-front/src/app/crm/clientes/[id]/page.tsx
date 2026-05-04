'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  User, 
  Mail, 
  Phone, 
  FileText, 
  ArrowLeft, 
  Save, 
  Trash2, 
  History, 
  ExternalLink,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  codParc: string | null;
  vendedorId: string | null;
  vendedor?: {
    email: string;
    role: string;
  } | null;
  createdAt: string;
};

export default function DetalheClientePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    codParc: '',
    vendedorId: ''
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (clienteId) {
      loadData();
    }
  }, [clienteId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const [clientesResp, vendorsResp] = await Promise.all([
        fetch(`${API_BASE}/crm/clientes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/crm/vendedores`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!clientesResp.ok || !vendorsResp.ok) throw new Error('Falha ao carregar dados');

      const clientesData: Cliente[] = await clientesResp.json();
      const vendorsData = await vendorsResp.json();
      
      setVendedores(vendorsData);

      const found = clientesData.find(c => c.id === clienteId);
      if (found) {
        setCliente(found);
        setFormData({
          nome: found.nome || '',
          email: found.email || '',
          telefone: found.telefone || '',
          documento: found.documento || '',
          codParc: found.codParc || '',
          vendedorId: found.vendedorId || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const token = localStorage.getItem('authToken');
      // Nota: Precisaremos garantir que o backend tenha um PATCH /crm/clientes/:id
      // Por enquanto, simulamos ou usamos o que estiver disponível
      const resp = await fetch(`${API_BASE}/crm/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!resp.ok) throw new Error('Falha ao salvar');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-slate-500 font-bold">Carregando dados do cliente...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!cliente) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertCircle className="w-16 h-16 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-800">Cliente não encontrado</h2>
          <button onClick={() => router.back()} className="text-emerald-600 font-bold hover:underline">Voltar</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout subtitle={`Detalhes: ${cliente.nome}`}>
      <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in-up">
        
        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Ficha do Cliente</h1>
            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Gerenciamento de Cadastro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                    <User className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Informações Básicas</h2>
                </div>
                {success && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-bounce">
                    <CheckCircle2 className="w-4 h-4" />
                    Alterações salvas!
                  </div>
                )}
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nome Completo / Razão Social</label>
                    <input 
                      type="text" 
                      value={formData.nome}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">CPF / CNPJ</label>
                    <input 
                      type="text" 
                      value={formData.documento}
                      onChange={e => setFormData({...formData, documento: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Código Sankhya (CodParc)</label>
                    <input 
                      type="text" 
                      value={formData.codParc}
                      onChange={e => setFormData({...formData, codParc: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.telefone}
                        onChange={e => setFormData({...formData, telefone: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Vendedor Responsável (Carteira)</label>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select 
                        value={formData.vendedorId}
                        onChange={e => setFormData({...formData, vendedorId: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium appearance-none"
                      >
                        <option value="">Nenhum (Livre na Carteira Geral)</option>
                        {vendedores.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.email.split('@')[0].toUpperCase()} ({v.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            
            {/* Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Status do Cadastro</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${cliente.codParc ? 'bg-emerald-500 shadow-emerald-200 shadow-[0_0_10px]' : 'bg-amber-500 shadow-amber-200 shadow-[0_0_10px]'}`} />
                <span className="font-bold text-slate-700">{cliente.codParc ? 'Sincronizado Sankhya' : 'Apenas CRM (Lead)'}</span>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Registrado em: {new Date(cliente.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>

            {/* Vendedor Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Responsável</h3>
              {cliente.vendedor ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black">
                    {cliente.vendedor.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{cliente.vendedor.email.split('@')[0]}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">{cliente.vendedor.role}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">Sem vendedor atribuído</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 p-6 text-white">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(`/crm?clienteId=${cliente.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all font-bold text-sm"
                >
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Abrir Nova Negociação
                </button>
                <button 
                  onClick={() => router.push(`/crm/carteira`)}
                  className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all font-bold text-sm"
                >
                  <History className="w-5 h-5 text-blue-400" />
                  Ver Histórico de Vendas
                </button>
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
