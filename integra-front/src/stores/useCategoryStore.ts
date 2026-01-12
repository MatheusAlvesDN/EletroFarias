// stores/useCategoryStore.ts
import { create } from 'zustand';

interface CategoryStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
  fetchCategories: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  fetchCategories: async () => {
    const res = await fetch(`${API_URL}/sync/getAllCategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    set({ categories: data });
  },
}));