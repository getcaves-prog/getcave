import Link from "next/link";

// ─── CONVIÉRTETE EN ORGANIZADOR — dark bordered CTA card ─────────────────────
// Links to /communities/new. Rendered only when the user is NOT yet an
// organizer (the parent hides it for owners).
export function OrganizerCtaCard() {
  return (
    <Link
      href="/communities/new"
      className="group block rounded-xl border border-cave-ash bg-cave-dark px-4 py-4 transition-colors hover:border-cave-smoke active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] font-bold uppercase tracking-[0.08em]">
            Conviértete en organizador
          </p>
          <p className="mt-1 text-xs text-cave-fog font-[family-name:var(--font-inter)] leading-relaxed">
            Crea y gestiona tu comunidad, eventos y experiencias
          </p>
        </div>
        <span className="text-lg text-cave-fog transition-transform group-hover:translate-x-0.5 group-hover:text-cave-white">
          →
        </span>
      </div>
    </Link>
  );
}
