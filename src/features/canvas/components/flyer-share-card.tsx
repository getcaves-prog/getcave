"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Creator {
  username: string;
  avatar_url: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface FlyerShareCardProps {
  flyer: {
    id: string;
    image_url: string;
    title: string | null;
    is_promoted?: boolean | null;
    address?: string | null;
  };
  creator: Creator | null;
  categories: Category[];
  viewCount: number;
  daysRemaining: number | null;
}

export function FlyerShareCard({
  flyer,
  creator,
  categories,
  viewCount,
  daysRemaining,
}: FlyerShareCardProps) {
  const [toast, setToast] = useState(false);

  const [flyerUrl, setFlyerUrl] = useState(`/flyer/${flyer.id}`);

  useEffect(() => {
    setFlyerUrl(`${window.location.origin}/flyer/${flyer.id}`);
  }, [flyer.id]);

  const shareText = (flyer.title || "Check this out") + " — Found on Caves";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(flyerUrl);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {}
  };

  return (
    <div className="relative w-full max-w-[420px]">
      {/* The card */}
      <div className="rounded-3xl bg-cave-stone/90 p-3 pb-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {/* Flyer image — large, minimal padding */}
        <div
          className={`relative w-full overflow-hidden rounded-2xl mb-3 ${flyer.is_promoted ? "ring-1 ring-amber-500/30" : ""}`}
          style={{ aspectRatio: "7 / 10" }}
        >
          <Image
            src={flyer.image_url}
            alt={flyer.title ?? "Event flyer"}
            fill
            sizes="420px"
            className="object-cover"
            priority
            unoptimized
          />
          {flyer.is_promoted && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[9px] text-amber-300">Promoted</span>
            </div>
          )}
        </div>

        {/* Title */}
        {flyer.title && (
          <h2 className="text-lg text-cave-white font-bold leading-tight mb-1 truncate px-2">
            {flyer.title}
          </h2>
        )}

        {/* Creator */}
        {creator ? (
          <Link
            href={`/profile/${creator.username}`}
            className="flex items-center gap-2 mb-3 px-2 group"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-cave-rock border border-cave-ash shrink-0">
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.username}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cave-smoke">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-sm text-cave-fog group-hover:text-cave-white transition-colors">
              {creator.username}
            </span>
          </Link>
        ) : (
          <div className="mb-3" />
        )}

        {/* Share buttons row */}
        <div className="flex items-center gap-2 mb-3 px-2">
          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + flyerUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
            aria-label="WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          {/* X/Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(flyerUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
            aria-label="X"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-cave-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(flyerUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
            aria-label="Facebook"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#1877F2]">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cave-rock hover:bg-cave-ash transition-colors"
            aria-label="Copy link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-fog">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>

        {/* Views */}
        {viewCount > 0 && (
          <div className="px-2">
            <span className="text-[10px] text-cave-smoke">{viewCount} views</span>
          </div>
        )}
      </div>

      {/* Categories below card */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-3 justify-center">
          {categories.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cave-rock/50 text-[10px] text-cave-smoke"
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-cave-rock border border-cave-ash text-xs text-cave-white font-[family-name:var(--font-space-mono)]">
          Link copied
        </div>
      )}
    </div>
  );
}
