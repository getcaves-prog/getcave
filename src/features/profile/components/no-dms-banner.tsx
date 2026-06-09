// ─── No-DMs banner — static slim info card ───────────────────────────────────
// Reinforces the CAVES product principle: connections happen at events, not DMs.
export function NoDmsBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-cave-ash/50 bg-cave-dark px-4 py-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-cave-fog"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] leading-relaxed">
        En CAVES no existen mensajes privados. Las conexiones reales pasan en los
        eventos.
      </p>
    </div>
  );
}
