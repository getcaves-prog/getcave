import Image from "next/image";
import { formatDate, formatPrice } from "@/shared/lib/utils/format";
import type { EventDetail as EventDetailType } from "../types/event.types";
import { EventMetadata } from "./event-metadata";
import { EventShareButton } from "./event-share-button";
import { EventMap } from "./event-map";
import { EventViewTracker } from "./event-view-tracker";

interface EventDetailProps {
  event: EventDetailType;
}

function ArrowLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function EventDetail({ event }: EventDetailProps) {
  const eventUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/event/${event.id}`
      : `${process.env.NEXT_PUBLIC_APP_URL || "https://joincaves.com"}/event/${event.id}`;

  const shareText = `${event.title} — ${formatDate(event.date)} en ${event.venue_name}${event.price ? ` · ${formatPrice(event.price, event.currency)}` : " · Gratis"}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <EventViewTracker eventId={event.id} />

      {/* Flyer image */}
      <div className="relative w-full max-h-[60vh] overflow-hidden">
        {/* Back button overlay */}
        <a
          href="/"
          className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white transition-all active:scale-95"
          aria-label="Volver"
        >
          <ArrowLeftIcon />
        </a>

        <Image
          src={event.flyer_url}
          alt={event.title}
          width={1200}
          height={630}
          className="w-full h-auto object-cover max-h-[60vh]"
          priority
          sizes="100vw"
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-6 px-4 pb-24 space-y-6">
        {/* Title + Category */}
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-white leading-tight">
            {event.title}
          </h1>
        </div>

        {/* Metadata */}
        <EventMetadata event={event} />

        {/* Description */}
        {event.description && (
          <div>
            <h2 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wider mb-2">
              Descripción
            </h2>
            <p className="text-sm text-[#E0E0E0] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* Map */}
        <div>
          <h2 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">
            Ubicación
          </h2>
          <EventMap
            venueName={event.venue_name}
            venueAddress={event.venue_address}
          />
        </div>

        {/* Promoter info */}
        {event.profiles && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
            {event.profiles.avatar_url ? (
              <Image
                src={event.profiles.avatar_url}
                alt={event.profiles.username}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A2A2A] text-sm font-medium text-white">
                {event.profiles.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {event.profiles.username}
              </p>
              <p className="text-xs text-[#A0A0A0]">Organizador</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <EventShareButton
            title={event.title}
            text={shareText}
            url={eventUrl}
          />

          {event.external_url && (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D4D] px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 hover:bg-[#FF3333]"
            >
              <ExternalLinkIcon />
              Más info
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
