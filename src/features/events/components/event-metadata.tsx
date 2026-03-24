import {
  formatEventDateRange,
  formatPrice,
} from "@/shared/lib/utils/format";
import type { EventDetail } from "../types/event.types";

interface EventMetadataProps {
  event: EventDetail;
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function EventMetadata({ event }: EventMetadataProps) {
  const dateRange = formatEventDateRange(
    event.date,
    event.time_start,
    event.time_end
  );
  const price = formatPrice(event.price, event.currency);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[#E0E0E0]">
        <CalendarIcon />
        <span className="text-sm">{dateRange}</span>
      </div>

      <div className="flex items-center gap-3 text-[#E0E0E0]">
        <MapPinIcon />
        <span className="text-sm">{event.venue_name}</span>
      </div>

      <div className="flex items-center gap-3 text-[#E0E0E0]">
        <DollarIcon />
        <span className="text-sm">{price}</span>
      </div>

      {event.categories && (
        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2A2A2A] px-3 py-1 text-xs font-medium text-[#E0E0E0]">
            {event.categories.icon && (
              <span>{event.categories.icon}</span>
            )}
            {event.categories.name}
          </span>
        </div>
      )}
    </div>
  );
}
