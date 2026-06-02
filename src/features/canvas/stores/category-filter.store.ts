import { create } from "zustand";

interface CategoryFilterState {
  selectedCategoryId: string | null;
  setCategory: (categoryId: string | null) => void;
}

export const useCategoryFilterStore = create<CategoryFilterState>((set) => ({
  selectedCategoryId: null,
  setCategory: (categoryId) => set({ selectedCategoryId: categoryId }),
}));
