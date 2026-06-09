"use client";

import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { MyEvent } from "../types/activity.types";

interface ProfileUpcomingCarouselProps {
  events: MyEvent[];
}

// ─── PRÓXIMOS EVENTOS — horizontal mini-card carousel ────────────────────────
// Adapted from community-upcoming-carousel. Each card links to its flyer.
// Hides itself when there are no upcoming events.
export function ProfileUpcomingCarousel({ events }: ProfileUpcomingCarouselProps) {
  if (events.length === 0) return null;

  return (
    <section>
      <SectionHeading
        trailing={
          <Link
            href="/events"
            className="text-[10px] text-cave-smoke hover:text-cave-light transition-colors font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em]"
          >
            Ver todos →
          </Link>
        }
      >
        Próximos eventos
      </SectionHeading>

      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => {
          const dateChip = event.event_date
            ? new Date(event.event_date + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })
            : null;
          return (
            <Link
              key={event.id}
              href={`/flyer/${event.id}`}
              className="group flex-shrink-0 w-[150px] snap-start active:scale-[0.98] transition-transform"
            >
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/40">
                {event.image_url && (
                  <Image
                    src={event.image_url}
                    alt={event.title ?? "Evento"}
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
              {event.title && (
                <p className="mt-2 text-xs text-cave-light font-[family-name:var(--font-inter)] leading-snug line-clamp-2">
                  {event.title}
                </p>
              )}
              {event.community_name && (
                <p className="mt-0.5 text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] truncate">
                  {event.community_name}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
