// stores/useUpdateLocStore.ts
import { create } from 'zustand';

type Produto = {
  CODPROD?: string | number | null;
  DESCRPROD?: string | null;
  MARCA?: string | null;
  CARACTERISTICAS?: string | null;
  CODVOL?: string | null;
  CODGRUPOPROD?: string | null;
  LOCALIZACAO?: string | null;
  AD_QTDMAX?: number | null;
  AD_LOCALIZACAO?: string | null;
  DESCRGRUPOPROD?: string | null;
};

interface UpdateLocStore {
  // state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  produto: Produto | null;
  localizacao: string;
  AD_LOCALIZACAO: string | null;
  AD_QTDMAX: number | null;
  lastUpdatedAt: number | null;

  // actions
  clear: () => void;
  getUpdateLocation: (codProd: number) => Promise<Produto | null>;
  sendUpdateLocation: (codProd: number, localizacao: string) => Promise<boolean>;
  sendUpdateLocation2: (codProd: number, localizacao: string) => Promise<boolean>;
  sendUpdateQtdMax: (codProd: number, quantidade: number) => Promise<boolean>;

}

export const useUpdateLocStore = create<UpdateLocStore>((set, get) => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? '';

  const GET_URL = (id: number) =>
    API_BASE
      ? `${API_BASE}/sync/getProductLocation?id=${encodeURIComponent(id)}`
      : `/sync/getProductLocation?id=${encodeURIComponent(id)}`;

  const UPDATE_URL_BASE = API_BASE
    ? `${API_BASE}/sync/updateProductLocation`
    : `/sync/updateProductLocation`;

  const UPDATE_URL_BASE2 = API_BASE
    ? `${API_BASE}/sync/updateProductLocation2`
    : `/sync/updateProductLocation2`;

  const UPDATE_QTD_URL_BASE = API_BASE
    ? `${API_BASE}/sync/updateQtdMax`
    : `/sync/updateQtdMax`;


  const buildHeaders = (json = true): Record<string, string> => {
    const h: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
    if (API_TOKEN) h.Authorization = `Bearer ${API_TOKEN}`;
    return h;
  };

  const getErrorMessage = (e: unknown, fallback: string) =>
    e instanceof Error ? e.message : fallback;

  return {
    // state
    isLoading: false,
    isSaving: false,
    error: null,
    produto: null,
    localizacao: '',
    AD_LOCALIZACAO: '',
    AD_QTDMAX: 0,
    lastUpdatedAt: null,

    // actions
    clear: () => set({ produto: null, localizacao: '', error: null }),

    // GET localização (carrega dados do produto)
    getUpdateLocation: async (codProd: number) => {
      set({ isLoading: true, error: null });
      try {
        const resp = await fetch(GET_URL(codProd), {
          method: 'GET',
          headers: buildHeaders(false),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha na busca (status ${resp.status})`);
        }

        const data = (await resp.json()) as Produto | null;

        if (!data || (!data.CODPROD && !data.DESCRPROD)) {
          set({ produto: null, localizacao: '', AD_LOCALIZACAO : '',  AD_QTDMAX: 0 });
          throw new Error('Produto não encontrado.');
        }

        set({
          produto: data,
          localizacao: data.LOCALIZACAO ?? '',
          AD_LOCALIZACAO: data.AD_LOCALIZACAO ?? '',
          AD_QTDMAX: data.AD_QTDMAX ?? 0,
          error: null,
        });

        return data;
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Erro ao buscar produto') });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },

    // POST atualização (envia a nova localização)
    sendUpdateLocation: async (codProd: number, localizacao: string) => {
      set({ isSaving: true, error: null });
      try {
        // só query params; nada de body
        const url = `${UPDATE_URL_BASE}?id=${encodeURIComponent(codProd)}&location=${localizacao}`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(false), // sem Content-Type já que não há body
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao atualizar localização (status ${resp.status})`);
        }

        const { produto } = get();
        set({
          produto: produto ? { ...produto, LOCALIZACAO: localizacao } : produto,
          localizacao,
          lastUpdatedAt: Date.now(),
        });
        return true;
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Erro ao atualizar localização') });
        return false;
      } finally {
        set({ isSaving: false });
      }
    },


    sendUpdateLocation2: async (codProd: number, localizacao: string) => {
      set({ isSaving: true, error: null });
      try {
        // só query params; nada de body
        const url = `${UPDATE_URL_BASE2}?id=${encodeURIComponent(codProd)}&location=${localizacao}`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(false), // sem Content-Type já que não há body
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao atualizar localização (status ${resp.status})`);
        }

        const { produto } = get();
        set({
          produto: produto ? { ...produto, AD_LOCALIZACAO: localizacao } : produto,
          AD_LOCALIZACAO : localizacao,
          lastUpdatedAt: Date.now(),
        });
        return true;
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Erro ao atualizar localização') });
        return false;
      } finally {
        set({ isSaving: false });
      }
    },

    sendUpdateQtdMax: async (codProd: number, quantidade: number) => {
      set({ isSaving: true, error: null });
      try {
        // só query params; nada de body
        const url = `${UPDATE_QTD_URL_BASE}?id=${encodeURIComponent(codProd)}&location=${quantidade}`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(false), // sem Content-Type já que não há body
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha ao atualizar localização (status ${resp.status})`);
        }

        if(quantidade === null){
          throw new Error('quantidade não pode ser nula')
        }
        
        //const quantidadeString = quantidade.toString();

        const { produto } = get();
        set({
          produto: produto ? { ...produto, AD_QTDMAX: quantidade } : produto,
          AD_QTDMAX: quantidade,
          lastUpdatedAt: Date.now(),
        });
        return true;
      } catch (err: unknown) {
        set({ error: getErrorMessage(err, 'Erro ao atualizar localização') });
        return false;
      } finally {
        set({ isSaving: false });
      }
    },

  };
});
