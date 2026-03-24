"use client";

export function FeedEmpty() {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-8">
      {/* Empty icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1A1A]">
        <svg
          className="h-10 w-10 text-[#A0A0A0]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-white">No events nearby</h2>
        <p className="max-w-xs text-sm leading-relaxed text-[#A0A0A0]">
          There are no upcoming events in your area right now. Try expanding
          your search radius or check back later.
        </p>
      </div>
    </div>
  );
}
