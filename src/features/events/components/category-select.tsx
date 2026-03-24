"use client";

import { cn } from "@/shared/lib/utils/cn";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  error,
}: CategorySelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[#A0A0A0]">Categoria</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-xl bg-[#2A2A2A] px-4 text-white border border-transparent focus:border-[#FF4D4D] focus:outline-none transition-colors appearance-none",
          error && "border-red-500"
        )}
      >
        <option value="">Selecciona una categoria</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.icon} {cat.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
