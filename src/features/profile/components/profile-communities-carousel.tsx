"use client";

import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/shared/components/ui/section-heading";
import type { MyCommunity } from "../types/activity.types";

interface ProfileCommunitiesCarouselProps {
  communities: MyCommunity[];
}

// ─── MIS COMUNIDADES — horizontal card carousel ──────────────────────────────
// Each card links to /communities/{slug}. Hides itself when empty.
export function ProfileCommunitiesCarousel({
  communities,
}: ProfileCommunitiesCarouselProps) {
  if (communities.length === 0) return null;

  return (
    <section>
      <SectionHeading
        trailing={
          <Link
            href="/communities"
            className="text-[10px] text-cave-smoke hover:text-cave-light transition-colors font-[family-name:var(--font-space-mono)] uppercase tracking-[0.1em]"
          >
            Ver todas →
          </Link>
        }
      >
        Mis comunidades
      </SectionHeading>

      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {communities.map((community) => {
          const image = community.cover_url ?? community.avatar_url;
          return (
            <Link
              key={community.id}
              href={`/communities/${community.slug}`}
              className="group flex-shrink-0 w-[160px] snap-start active:scale-[0.98] transition-transform"
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-cave-stone border border-cave-ash/40">
                {image ? (
                  <Image
                    src={image}
                    alt={community.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-cave-smoke">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-cave-black/85 via-transparent to-transparent" />
              </div>
              <p className="mt-2 text-xs text-cave-light font-[family-name:var(--font-inter)] leading-snug line-clamp-1">
                {community.name}
              </p>
              <p className="mt-0.5 text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
                {community.member_count}{" "}
                {community.member_count === 1 ? "miembro" : "miembros"}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
