// stores/useCategoryStore.ts
import { create } from 'zustand';

interface CategoryStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  fetchCategories: async () => {
    const res = await fetch('http://localhost:3000/sync/getAllCategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    set({ categories: data });
  },
}));