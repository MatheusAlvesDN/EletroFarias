'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  FileSpreadsheet,
  UploadCloud,
  Database
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';

export default function ImportacaoNcm() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estados do Upload
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado do Toast de Notificação
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Lógica básica de autenticação da sua plataforma
    const t = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!t) {
      router.replace('/');
      return;
    }
    // Aqui você decodificaria o JWT, mas para o exemplo deixaremos estático
    setUserEmail('usuario@empresa.com.br');
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const toast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast('Por favor, selecione apenas arquivos CSV.', 'error');
        setFile(null);
        e.target.value = ''; // Reseta o input
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast('Nenhum arquivo selecionado.', 'error');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim();
      
      const response = await fetch(`${API_BASE}/sankhya/ncm/upload`, {
        method: 'POST',
        // headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: formData
      });

      if (response.ok) {
        toast('Arquivo importado com sucesso para a base do Sankhya!', 'success');
        setFile(null); // Limpa o arquivo após sucesso
        
        // Reseta o input file (hack simples)
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao processar o arquivo no servidor.');
      }
    } catch (err: any) {
      toast(err.message || 'Erro de conexão com a API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Botão do Menu Flutuante */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-emerald-800 hover:bg-slate-50 transition-transform active:scale-95 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        title="Abrir Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} userEmail={userEmail} onLogout={handleLogout} />

      {/* Cabeçalho */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start pl-16 md:pl-20 transition-all">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 opacity-90 text-emerald-100" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Painel Gerencial</h1>
                <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-wider">Integração Sankhya</p>
              </div>
            </div>
            {/* Logos como no seu layout */}
            <div className="flex gap-4 items-center">
              <img
                src="/eletro_farias2.png"
                alt="Logo 1"
                className="h-16 w-auto object-contain bg-green/10 rounded px-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <img
                src="/lid-verde-branco.png"
                alt="Logo 2"
                className="h-12 w-auto object-contain hidden md:block"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        
        {/* Título da Seção */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Importação de NCM e MVA</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Envie a planilha CSV padronizada para atualizar a tabela <span className="font-mono text-emerald-600 bg-emerald-50 px-1 rounded">AD_TABNCM</span> no banco de dados.
          </p>
        </div>

        {/* Card de Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-200 text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-emerald-900 uppercase tracking-wide">Upload de Arquivo CSV</h2>
                <p className="text-[10px] sm:text-xs text-emerald-700/70 font-bold uppercase tracking-wider mt-0.5">
                  Campos obrigatórios: NCM, MVA_Orig, MVA_Aliq4pct, MVVA_Aliq7pct, MVVA_Aliq12pct
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-50/30">
            <form onSubmit={handleUpload} className="flex flex-col gap-6">
              
              {/* Área de Drop / Seleção de Arquivo */}
              <div className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                
                {file ? (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-emerald-500 mb-3" />
                    <h3 className="text-sm font-bold text-emerald-800">{file.name}</h3>
                    <p className="text-xs text-emerald-600/80 font-medium mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-4 mt-2 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                      Clique para trocar o arquivo
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">Arraste seu CSV para cá ou clique para selecionar</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Apenas arquivos no formato .csv</p>
                  </>
                )}
              </div>

              {/* Botão de Enviar */}
              <button
                type="submit"
                disabled={!file || loading}
                className={`w-full px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 h-[52px] ${
                  !file 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando e Enviando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    <span>Importar para o Sankhya</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Componente de Toast */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
            toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
          }`}
        >
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {toastState.msg}
          <button
            type="button"
            onClick={() => setToastState((s) => ({ ...s, open: false }))}
            className="ml-2 hover:opacity-75 transition-opacity focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}