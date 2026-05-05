"use client";

import { formatEventDate } from "@/shared/lib/date/format-event-date";

interface EventInfoLineProps {
  username?: string | null;
  zoneName?: string | null;
  eventDate?: string | null;
}

/**
 * Renders a single line of event metadata.
 *
 * Logged in:    "[USERNAME] — [ZONE] · [HOY]"
 * Not logged in: "[ZONE] · [HOY]"
 *
 * Zone and date label are omitted when not available.
 */
export function EventInfoLine({ username, zoneName, eventDate }: EventInfoLineProps) {
  const dateLabel = formatEventDate(eventDate ?? null);

  const zonePart = zoneName ?? null;
  const datePart = dateLabel;

  // Build the right side: "ZONE · DATE" or just "ZONE" or just "DATE"
  const rightParts: string[] = [];
  if (zonePart) rightParts.push(zonePart);
  if (datePart) rightParts.push(datePart);

  const rightSide = rightParts.join(" · ");

  if (!username && !rightSide) return null;

  let line: string;
  if (username && rightSide) {
    line = `${username.toUpperCase()} — ${rightSide}`;
  } else if (username) {
    line = username.toUpperCase();
  } else {
    line = rightSide;
  }

  return (
    <p
      className="text-sm uppercase text-cave-fog font-[family-name:var(--font-space-mono)] truncate leading-none"
      title={line}
    >
      {line}
    </p>
  );
}
