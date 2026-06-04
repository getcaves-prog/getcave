import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
  /** Optional trailing slot — renders on the right side (e.g. count, action) */
  trailing?: ReactNode;
}

/**
 * Shared section/card label with the Punk Cave terminal aesthetic.
 * Space Mono · 10px · uppercase · wide tracking · neon-green left accent.
 * Always includes mb-3 so label-to-content spacing is consistent.
 */
export function SectionHeading({ children, className = "", trailing }: SectionHeadingProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <span className="border-l-2 border-[#39FF14]/50 pl-2.5 text-[10px] uppercase tracking-[0.2em] text-cave-fog font-[family-name:var(--font-space-mono)]">
        {children}
      </span>
      {trailing && (
        <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
          {trailing}
        </span>
      )}
    </div>
  );
}
