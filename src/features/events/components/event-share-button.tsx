"use client";

import { useCallback, useState } from "react";

interface EventShareButtonProps {
  title: string;
  text: string;
  url: string;
}

function ShareIcon() {
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
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function EventShareButton({
  title,
  text,
  url,
}: EventShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled share — do nothing
      }
      return;
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [title, text, url]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2A2A2A] px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 hover:bg-[#333333]"
      aria-label="Compartir evento"
    >
      <ShareIcon />
      {copied ? "Enlace copiado" : "Compartir"}
    </button>
  );
}
