"use client";

import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { Tables } from "@/shared/types/database.types";

interface ProfileFlyersCarouselProps {
  flyers: Tables<"flyers">[];
  /** Section label — "Mis flyers" on own profile, "Flyers" / "Eventos" on others */
  title?: string;
}

// ─── MIS FLYERS — flyers/events the user has published ───────────────────────
// Mirrors the Próximos eventos carousel styling. Each card links to its flyer.
// Hides itself when the user hasn't posted any flyers.
export function ProfileFlyersCarousel({ flyers, title = "Mis flyers" }: ProfileFlyersCarouselProps) {
  if (flyers.length === 0) return null;

  return (
    <section>
      <SectionHeading>{title}</SectionHeading>

      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {flyers.map((flyer) => {
          const dateChip = flyer.event_date
            ? new Date(flyer.event_date + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })
            : null;
          return (
            <Link
              key={flyer.id}
              href={`/flyer/${flyer.id}`}
              className="group flex-shrink-0 w-[150px] snap-start active:scale-[0.98] transition-transform"
            >
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/40">
                {flyer.image_url && (
                  <Image
                    src={flyer.image_url}
                    alt={flyer.title ?? "Flyer"}
                    fill
                    sizes="150px"
                    className="object-cover"
                    unoptimized
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-cave-black/80 via-transparent to-transparent" />
                {dateChip && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-cave-black/70 backdrop-blur-sm text-[9px] uppercase tracking-[0.08em] text-cave-white font-[family-name:var(--font-space-mono)]">
                    {dateChip}
                  </span>
                )}
              </div>
              {flyer.title && (
                <p className="mt-2 text-xs text-cave-light font-[family-name:var(--font-inter)] leading-snug line-clamp-2">
                  {flyer.title}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
