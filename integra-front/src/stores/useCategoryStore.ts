// stores/useCategoryStore.ts
import { create } from 'zustand';

interface CategoryStore {
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