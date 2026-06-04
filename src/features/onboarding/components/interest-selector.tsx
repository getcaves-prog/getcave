"use client";

import { motion } from "framer-motion";
import { useInterests } from "@/features/onboarding/hooks/use-interests";

interface InterestSelectorProps {
  /** Called after a successful save */
  onSave?: () => void;
  /** Label for the CTA button */
  ctaLabel?: string;
}

export function InterestSelector({
  onSave,
  ctaLabel = "Guardar",
}: InterestSelectorProps) {
  const { categories, selected, toggle, save, loading, saving, error } =
    useInterests();

  async function handleSave() {
    await save();
    onSave?.();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cave-fog border-t-[#FFFFFF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hint */}
      <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] text-center">
        Elegí tus intereses para descubrir mejor
      </p>

      {/* Error message */}
      {error && (
        <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)] text-center">
          {error}
        </p>
      )}

      {/* Category chip grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <motion.button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`
                min-h-[56px] flex items-center gap-2.5 px-4 py-3 rounded-xl border
                text-sm font-[family-name:var(--font-space-mono)] transition-colors
                ${
                  isSelected
                    ? "bg-[#FFFFFF]/10 border-[#FFFFFF] text-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    : "bg-cave-rock/60 border-cave-ash text-cave-fog hover:border-cave-fog hover:text-cave-white"
                }
              `}
              aria-pressed={isSelected}
            >
              {cat.icon && (
                <span className="text-base leading-none select-none">
                  {cat.icon}
                </span>
              )}
              <span className="leading-tight">{cat.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="
          mt-2 min-h-[48px] w-full rounded-full
          bg-[#FFFFFF] text-cave-black text-sm font-medium
          font-[family-name:var(--font-space-mono)]
          disabled:opacity-50 transition-opacity
          hover:brightness-110 active:brightness-95
        "
      >
        {saving ? "Guardando..." : ctaLabel}
      </button>
    </div>
  );
}
