"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { Tables } from "@/shared/types/database.types";

type Flyer = Tables<"flyers">;

const DURATION_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
];

interface FlyerEditModalProps {
  flyer: Flyer;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    address?: string;
    duration_days?: number;
  }) => Promise<boolean>;
}

export function FlyerEditModal({ flyer, onClose, onSave }: FlyerEditModalProps) {
  const [title, setTitle] = useState(flyer.title ?? "");
  const [address, setAddress] = useState(flyer.address ?? "");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);

    const updates: {
      title?: string;
      address?: string;
      duration_days?: number;
    } = {};

    if (title !== (flyer.title ?? "")) updates.title = title;
    if (address !== (flyer.address ?? "")) updates.address = address;
    if (durationDays) updates.duration_days = durationDays;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    const success = await onSave(updates);
    if (!success) {
      setError("Failed to save changes. Please try again.");
    }
    setSaving(false);
  }, [title, address, durationDays, flyer.title, flyer.address, onSave, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 backdrop-blur-2xl"
        onClick={onClose}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.92) 70%, rgba(0,0,0,0.97) 100%)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      />

      {/* Modal content */}
      <motion.div
        className="relative z-10 flex flex-col w-full max-w-[380px] max-h-[70vh] overflow-y-auto rounded-2xl bg-cave-rock border border-cave-ash p-5 scrollbar-hide"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-cave-fog hover:text-cave-white transition-colors"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-lg text-cave-white font-[family-name:var(--font-space-mono)]">
            Edit Flyer
          </h2>
        </div>

        {/* Title */}
        <div className="mb-4">
          <Input
            label="Title"
            placeholder="Flyer title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <Input
            label="Address"
            placeholder="Venue address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Duration extension */}
        <div className="mb-6">
          <label className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)] mb-2 block">
            Extend Duration
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setDurationDays(
                    durationDays === opt.value ? null : opt.value
                  )
                }
                className={`min-h-[44px] flex-1 rounded-full px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
                  durationDays === opt.value
                    ? "bg-cave-white text-cave-black"
                    : "border border-cave-ash text-cave-fog hover:text-cave-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-xs text-neon-pink mb-4">{error}</p>}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-cave-white text-cave-black hover:bg-cave-light"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
