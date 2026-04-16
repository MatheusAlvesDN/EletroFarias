'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useState, useRef } from 'react';
import {
  Database,
  Loader2,
  AlertCircle,
  Menu,
  CheckCircle2,
  X,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';
import SidebarMenu from '@/components/SidebarMenu'; // Ajuste o caminho se necessário

export default function ImportacaoNcmInterno() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

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
        toast('Formato não suportado. Por favor, selecione um arquivo CSV.', 'error');
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast('Selecione um arquivo primeiro.', 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Ajuste para a URL correta da sua API NestJS (ex: localhost:3000 ou 8080)
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'localhost:3001').trim();
      
      // Chamando o Controller do Prisma
      const response = await fetch(`${API_BASE}/prisma/ncm/upload`, {
        method: 'POST',
        // headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: formData
      });

      if (response.ok) {
        toast('Dados de NCM importados e salvos no banco interno com sucesso!', 'success');
        setFile(null);
        
        // Reset do input file
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Erro inesperado no servidor.');
      }
    } catch (err: any) {
      toast(err.message || 'Erro de conexão com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout subtitle="Módulo do Sistema">

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[800px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
        
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Importar MVA e Alíquotas</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Atualize a base de dados interna carregando a planilha CSV contendo as alíquotas MVA por NCM.
          </p>
        </div>

        {/* Card de Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-200 text-blue-600">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-blue-900 uppercase tracking-wide">Selecionar Arquivo</h2>
                <p className="text-[10px] sm:text-xs text-blue-700/70 font-bold uppercase tracking-wider mt-0.5">
                  Colunas obrigatórias: NCM, MVA_Orig, MVA_Aliq4pct, MVVA_Aliq7pct, MVVA_Aliq12pct
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-50/30">
            <form onSubmit={handleUpload} className="flex flex-col gap-6">
              
              <div className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 ${file ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
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
                    <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-3" />
                    <h3 className="text-sm font-bold text-blue-800">{file.name}</h3>
                    <p className="text-xs text-blue-600/80 font-medium mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-4 bg-white px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                      Clique para alterar
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">Solte seu arquivo CSV aqui</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Ou clique para procurar em seu computador</p>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={!file || loading}
                className={`w-full px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 h-[52px] ${
                  !file 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Importando dados...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    <span>Salvar no Banco</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
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