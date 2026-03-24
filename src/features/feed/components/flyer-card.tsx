"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDistance } from "@/shared/lib/utils/geo";
import { formatEventDateRange, formatPrice } from "@/shared/lib/utils/format";
import type { FeedEvent } from "../types/feed.types";

interface FlyerCardProps {
  event: FeedEvent;
}

export function FlyerCard({ event }: FlyerCardProps) {
  return (
    <Link
      href={`/event/${event.id}`}
      className="relative block h-full w-full overflow-hidden bg-[#0A0A0A]"
    >
      {/* Flyer image — full screen background */}
      <Image
        src={event.flyer_url}
        alt={event.title}
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Content overlay */}
      {/* pb-24 accounts for the fixed BottomNav overlay */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 pb-24">
        {/* Badges row */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#FF4D4D]/90 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {event.category_name}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {formatDistance(event.distance_meters)}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {formatPrice(event.price, event.currency)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold leading-tight text-white drop-shadow-lg">
          {event.title}
        </h2>

        {/* Date + time */}
        <p className="text-sm font-medium text-white/80">
          {formatEventDateRange(event.date, event.time_start, event.time_end)}
        </p>

        {/* Venue */}
        <div className="flex items-center gap-1.5 text-sm text-white/70">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <span className="truncate">{event.venue_name}</span>
        </div>
      </div>
    </Link>
  );
}
