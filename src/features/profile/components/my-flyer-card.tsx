"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  deleteMyFlyer,
  updateMyFlyer,
} from "@/features/profile/services/my-flyers.service";
import { FlyerEditModal } from "@/features/profile/components/flyer-edit-modal";
import type { Tables } from "@/shared/types/database.types";

type Flyer = Tables<"flyers">;

interface MyFlyerCardProps {
  flyer: Flyer;
  onChange: () => void;
}

function getStatusStyle(status: string | null): {
  label: string;
  className: string;
} {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        className: "border-cave-white text-cave-white",
      };
    case "pending":
      return {
        label: "Pending",
        className: "border-cave-smoke text-cave-smoke",
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "border-cave-smoke text-cave-smoke",
      };
    case "expired":
      return {
        label: "Expired",
        className: "border-cave-smoke text-cave-smoke",
      };
    default:
      return {
        label: status ?? "Unknown",
        className: "border-cave-smoke text-cave-smoke",
      };
  }
}

function getExpiresLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Expires tomorrow";
  return `Expires in ${diffDays} days`;
}

export function MyFlyerCard({ flyer, onChange }: MyFlyerCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const statusStyle = getStatusStyle(flyer.status);
  const expiresLabel = getExpiresLabel(flyer.expires_at);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this flyer? This action cannot be undone.")) return;

    setDeleting(true);
    const success = await deleteMyFlyer(flyer.id, flyer.image_url);
    if (success) {
      onChange();
    }
    setDeleting(false);
  }, [flyer.id, flyer.image_url, onChange]);

  const handleEditSave = useCallback(
    async (updates: {
      title?: string;
      address?: string;
      duration_days?: number;
    }) => {
      const success = await updateMyFlyer(flyer.id, updates);
      if (success) {
        setEditOpen(false);
        onChange();
      }
      return success;
    },
    [flyer.id, onChange]
  );

  return (
    <>
      <div className="rounded-xl border border-cave-ash bg-cave-stone p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative w-16 h-[calc(16*10/7*4px)] shrink-0 rounded-lg overflow-hidden bg-cave-rock">
            <div
              className="relative w-16 shrink-0 rounded-lg overflow-hidden bg-cave-rock"
              style={{ aspectRatio: "7/10" }}
            >
              <Image
                src={flyer.image_url}
                alt={flyer.title ?? "Flyer"}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cave-white">
              {flyer.title ?? "Untitled"}
            </p>
            {flyer.address && (
              <p className="mt-0.5 truncate text-xs text-cave-fog">
                {flyer.address}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {/* Status badge */}
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wider ${statusStyle.className}`}
              >
                {statusStyle.label}
              </span>

              {/* Expires label */}
              {expiresLabel && (
                <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
                  {expiresLabel}
                </span>
              )}
            </div>

            <span className="mt-1 block font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
              {new Date(flyer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="min-h-[44px] flex-1 rounded-full border border-cave-ash px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-white transition-colors hover:bg-cave-white hover:text-cave-black"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="min-h-[44px] flex-1 rounded-full border border-cave-ash px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:bg-cave-rock disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <FlyerEditModal
          flyer={flyer}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}
