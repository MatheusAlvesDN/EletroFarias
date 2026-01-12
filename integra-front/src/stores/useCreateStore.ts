// stores/useCreateStore.ts
import { create } from 'zustand';

interface CreateStore {
  isLoading: boolean;
  sendCreateRequest: (id: string) => Promise<void>;
  sendEANRequest: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useCreateStore = create<CreateStore>((set) => ({
  isLoading: false,
  sendCreateRequest: async (id: string) => {
    set({ isLoading: true });

    try {
      await fetch(`${API_URL}/sync/create?id=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },
  sendEANRequest: async () => {
    set({ isLoading: true });
    try {
      await fetch(`${API_URL}/sync/updateEAN`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));