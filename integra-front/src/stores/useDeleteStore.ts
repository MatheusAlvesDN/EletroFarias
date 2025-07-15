// stores/useDeleteStore.ts
import { create } from 'zustand';

interface DeleteStore {
  alreadySent: boolean;
  isLoading: boolean;
  sendDeleteRequest: (id: string) => Promise<void>;
}

export const useDeleteStore = create<DeleteStore>((set, get) => ({
  alreadySent: false,
  isLoading: false,
  sendDeleteRequest: async (id: string) => {
    if (get().alreadySent) return;

    set({ isLoading: true });

    try {
      await fetch(`http://localhost:3000/sync/delete?id=${id}`, {
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
