"use client";

import { Button } from "@/shared/components/ui/button";

interface GeolocationPromptProps {
  onEnableLocation: () => void;
  onUseDefault: () => void;
  loading: boolean;
}

export function GeolocationPrompt({
  onEnableLocation,
  onUseDefault,
  loading,
}: GeolocationPromptProps) {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-8 bg-[#0A0A0A] px-8">
      {/* Location pin icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1A1A]">
        <svg
          className="h-10 w-10 text-[#FF4D4D]"
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
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-bold text-white">
          Discover events near you
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-[#A0A0A0]">
          Enable your location to see the best events, parties, and things
          to do around you.
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          onClick={onEnableLocation}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? "Detecting location..." : "Enable Location"}
        </Button>
        <Button
          onClick={onUseDefault}
          disabled={loading}
          variant="ghost"
          size="md"
          className="w-full"
        >
          Use Mexico City
        </Button>
      </div>
    </div>
  );
}
