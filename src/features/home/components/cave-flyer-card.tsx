"use client";

import Link from "next/link";
import { proxiedImageUrl } from "@/features/discover/services/image-proxy";
import { cn } from "@/shared/lib/utils/cn";

export type CaveFlyerSource = "facebook" | "instagram" | null;

export interface CaveFlyerCardProps {
  imageUrl: string;
  title: string;
  /** Month + day for the date badge, e.g. "19 MAY". Split on the space. */
  dateLabel?: string | null;
  /** Day of week, e.g. "Domingo". */
  dayLabel?: string | null;
  /** Time, e.g. "7:00 AM". */
  timeLabel?: string | null;
  /** Place / address line. */
  place?: string | null;
  /** Difficulty / level pill, e.g. "Principiante". */
  level?: string | null;
  /** Community name shown top-right. */
  communityName?: string | null;
  /** Attendees label, e.g. "35+". */
  attendees?: string | null;
  /** When set, renders a "vía …" source badge and proxies the image. */
  source?: CaveFlyerSource;
  /** External link (scraped flyers) — opens in a new tab. */
  externalUrl?: string | null;
  /** Internal route (real flyers) — client navigation. */
  href?: string | null;
  /** Big card for examples/carousel, smaller tile for the canvas. */
  variant?: "card" | "tile";
  className?: string;
}

/** Splits "19 MAY" → { day: "19", month: "MAY" }; tolerates a single token. */
function splitDate(dateLabel: string | null | undefined): {
  day: string;
  month: string;
} | null {
  if (!dateLabel) return null;
  const parts = dateLabel.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { day: parts[0], month: parts.slice(1).join(" ") };
  }
  return { day: parts[0], month: "" };
}

const SOURCE_LABEL: Record<NonNullable<CaveFlyerSource>, string> = {
  facebook: "vía Facebook",
  instagram: "vía Instagram",
};

/**
 * The "diseño CAVES" flyer template — renders a polished, consistent flyer from
 * structured data. Presentational + reusable. Two sizes via `variant`.
 *
 * Tap behaviour: `href` (internal) → client nav; else `externalUrl` (scraped) →
 * new tab. With neither, it renders as a static (non-interactive) card.
 */
export function CaveFlyerCard({
  imageUrl,
  title,
  dateLabel,
  dayLabel,
  timeLabel,
  place,
  level,
  communityName,
  attendees,
  source = null,
  externalUrl,
  href,
  variant = "card",
  className,
}: CaveFlyerCardProps) {
  const isTile = variant === "tile";
  const date = splitDate(dateLabel);
  // Scraped images live on FB/IG CDNs — proxy them; DB images are same-origin.
  const resolvedImage = source ? proxiedImageUrl(imageUrl) : imageUrl;

  const content = (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-cave-stone",
        "border border-cave-ash/60",
        className,
      )}
    >
      {/* Full-bleed background image (external URLs allowed → plain <img>). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedImage}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark gradient for legibility. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

      {/* Date badge — top-left. */}
      {date && (
        <div
          className={cn(
            "absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white text-black",
            isTile ? "px-2 py-1" : "px-3 py-1.5",
          )}
        >
          <span
            className={cn(
              "font-[family-name:var(--font-space-mono)] font-bold leading-none",
              isTile ? "text-base" : "text-xl",
            )}
          >
            {date.day}
          </span>
          {date.month && (
            <span
              className={cn(
                "font-[family-name:var(--font-space-mono)] uppercase leading-none tracking-wider text-cave-smoke",
                isTile ? "text-[8px]" : "text-[10px]",
              )}
            >
              {date.month}
            </span>
          )}
        </div>
      )}

      {/* Community name — top-right. */}
      {communityName && (
        <div className="absolute right-3 top-3 max-w-[55%] rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
          <span
            className={cn(
              "block truncate font-[family-name:var(--font-space-mono)] uppercase tracking-wide text-white",
              isTile ? "text-[8px]" : "text-[10px]",
            )}
          >
            {communityName}
          </span>
        </div>
      )}

      {/* Bottom info block. */}
      <div className={cn("absolute inset-x-0 bottom-0", isTile ? "p-3" : "p-4")}>
        {level && (
          <span
            className={cn(
              "mb-2 inline-block rounded-full border border-white/30 bg-white/10 font-[family-name:var(--font-space-mono)] uppercase tracking-wider text-white backdrop-blur-sm",
              isTile ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-1 text-[10px]",
            )}
          >
            Nivel {level}
          </span>
        )}

        <h3
          className={cn(
            "font-[family-name:var(--font-space-mono)] font-bold uppercase leading-tight text-white",
            isTile ? "text-sm" : "text-2xl",
          )}
        >
          {title}
        </h3>

        {(dayLabel || timeLabel) && (
          <p
            className={cn(
              "mt-1 font-[family-name:var(--font-space-mono)] text-cave-light",
              isTile ? "text-[10px]" : "text-sm",
            )}
          >
            {[dayLabel, timeLabel].filter(Boolean).join(" · ")}
          </p>
        )}

        {place && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-cave-fog",
              isTile ? "text-[10px]" : "text-sm",
            )}
          >
            <span aria-hidden>📍</span>
            <span className="truncate">{place}</span>
          </p>
        )}

        {attendees && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1.5 text-cave-light",
              isTile ? "text-[10px]" : "text-xs",
            )}
          >
            <span aria-hidden>👥</span>
            <span className="font-[family-name:var(--font-space-mono)]">
              {attendees} asistirán
            </span>
          </div>
        )}

        {source && (
          <div className="mt-2">
            <span
              className={cn(
                "inline-block rounded bg-black/50 font-[family-name:var(--font-space-mono)] uppercase tracking-wide text-cave-fog",
                isTile ? "px-1.5 py-0.5 text-[7px]" : "px-2 py-0.5 text-[9px]",
              )}
            >
              {SOURCE_LABEL[source]}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}
