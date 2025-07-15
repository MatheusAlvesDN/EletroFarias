// stores/useCreateStore.ts
import { create } from 'zustand';

interface CreateStore {
  isLoading: boolean;
  sendCreateRequest: (id: string) => Promise<void>;
}

export const useCreateStore = create<CreateStore>((set) => ({
  isLoading: false,
  sendCreateRequest: async (id: string) => {
    set({ isLoading: true });

    try {
      await fetch(`http://localhost:3000/sync/create?id=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));