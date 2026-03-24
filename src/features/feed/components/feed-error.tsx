"use client";

import { Button } from "@/shared/components/ui/button";

interface FeedErrorProps {
  message: string;
  onRetry: () => void;
}

export function FeedError({ message, onRetry }: FeedErrorProps) {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-8">
      {/* Error icon */}
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-white">
          Something went wrong
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-[#A0A0A0]">
          {message}
        </p>
      </div>

      <Button onClick={onRetry} size="md">
        Try again
      </Button>
    </div>
  );
}
