// stores/useUpdateLocStore.ts
import { create } from 'zustand';

interface UpdateLocStore {
  isLoading: boolean;
  sendUpdateRequest: (codProd: number) => Promise<void>;
}

export const useUpdateLocStore = create<UpdateLocStore>((set) => ({
  isLoading: false,

  sendUpdateRequest: async (codProd: number) => {
    set({ isLoading: true });
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
      const url = API_BASE
        ? `${API_BASE}/getProductLocation?id=${codProd}`
        : `/getProductLocation?id=${codProd}`;

      const resp = await fetch(url, { method: 'GET' });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha na atualização (status ${resp.status})`);
      }

      const data = await resp.json();
      console.log('Produto retornado:', data);

      // aqui você pode setar em outro estado global ou devolver o produto
    } catch (err) {
      console.error('Erro ao buscar produto:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));