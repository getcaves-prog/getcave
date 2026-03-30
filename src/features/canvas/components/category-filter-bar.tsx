"use client";

import { useEffect, useState } from "react";
import { getCategories } from "@/features/canvas/services/categories.service";
import { useCategoryFilterStore } from "../stores/category-filter.store";
import type { Category } from "@/features/canvas/services/categories.service";

export function CategoryFilterBar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const selectedCategoryId = useCategoryFilterStore((s) => s.selectedCategoryId);
  const setCategory = useCategoryFilterStore((s) => s.setCategory);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <div
      className="fixed z-40 left-0 right-0 overflow-x-auto scrollbar-hide"
      style={{
        top: "max(52px, calc(env(safe-area-inset-top) + 48px))",
      }}
    >
      <div className="flex gap-1.5 px-3 py-2">
        {/* All pill */}
        <button
          onClick={() => setCategory(null)}
          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-[family-name:var(--font-space-mono)] transition-colors ${
            selectedCategoryId === null
              ? "bg-cave-white text-cave-black border border-cave-white"
              : "bg-cave-rock/80 text-cave-fog border border-cave-ash hover:border-cave-fog backdrop-blur-sm"
          }`}
        >
          All
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(isSelected ? null : cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-[family-name:var(--font-space-mono)] transition-colors ${
                isSelected
                  ? "bg-cave-white text-cave-black border border-cave-white"
                  : "bg-cave-rock/80 text-cave-fog border border-cave-ash hover:border-cave-fog backdrop-blur-sm"
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
