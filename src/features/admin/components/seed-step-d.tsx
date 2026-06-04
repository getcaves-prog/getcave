"use client";

import Link from "next/link";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;

interface SeedStepDProps {
  community: Community;
  onReset: () => void;
}

export function SeedStepD({ community, onReset }: SeedStepDProps) {
  return (
    <div className="rounded-xl border border-cave-ash bg-cave-stone p-6 sm:p-8">
      {/* Success indicator */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-cave-white/20 bg-cave-rock">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cave-white"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="mb-2 font-[family-name:var(--font-space-mono)] text-lg text-cave-white">
        Comunidad sembrada
      </h2>
      <p className="mb-6 text-sm text-cave-fog">
        <span className="text-cave-white">{community.name}</span> fue creada exitosamente con sus eventos y mensajes oficiales.
      </p>

      {/* Community details */}
      <div className="mb-6 grid gap-3 rounded-xl border border-cave-ash bg-cave-rock p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-smoke">
            Nombre
          </p>
          <p className="text-cave-white">{community.name}</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-smoke">
            Slug
          </p>
          <p className="font-[family-name:var(--font-space-mono)] text-cave-white">
            {community.slug}
          </p>
        </div>
        {community.city && (
          <div>
            <p className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-smoke">
              Ciudad
            </p>
            <p className="text-cave-white">{community.city}</p>
          </div>
        )}
        {community.source_platform && (
          <div>
            <p className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-smoke">
              Origen
            </p>
            <p className="text-cave-white">{community.source_platform}</p>
          </div>
        )}
        <div>
          <p className="font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider text-cave-smoke">
            ID
          </p>
          <p className="font-[family-name:var(--font-space-mono)] text-[11px] text-cave-fog">
            {community.id}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/communities/${community.slug}`}
          target="_blank"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-cave-white px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80"
        >
          Ver comunidad
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[44px] items-center rounded-full border border-cave-ash bg-transparent px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:border-cave-fog hover:text-cave-white"
        >
          Sembrar otra comunidad
        </button>
      </div>
    </div>
  );
}
