"use client";

interface EventMapProps {
  venueName: string;
  venueAddress: string;
}

function MapPinIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FF4D4D"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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

export function EventMap({ venueName, venueAddress }: EventMapProps) {
  const mapsQuery = encodeURIComponent(`${venueName}, ${venueAddress}`);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden">
      {/* Static map placeholder */}
      <div className="relative h-32 bg-[#111111] flex items-center justify-center">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 text-[#A0A0A0] hover:text-white transition-colors"
        >
          <MapPinIcon />
          <span className="text-xs">Ver en el mapa</span>
        </a>
      </div>

      {/* Venue info + directions */}
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium text-white">{venueName}</p>
        <p className="text-xs text-[#A0A0A0]">{venueAddress}</p>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-2 rounded-xl bg-[#FF4D4D] px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 hover:bg-[#FF3333]"
        >
          <ExternalLinkIcon />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}
