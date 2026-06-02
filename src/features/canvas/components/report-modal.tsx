"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { reportFlyer } from "../services/reports.service";

const REPORT_REASONS = [
  "Spam or misleading",
  "Inappropriate content",
  "Expired/outdated event",
  "Other",
] as const;

interface ReportModalProps {
  flyerId: string;
  onClose: () => void;
  onReported: () => void;
}

export function ReportModal({ flyerId, onClose, onReported }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    setError(null);

    try {
      await reportFlyer(flyerId, selectedReason);
      onReported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }, [flyerId, selectedReason, onReported]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-cave-black/80 backdrop-blur-sm"
        onClick={onClose}
        style={{ WebkitBackdropFilter: "blur(8px)" }}
      />

      <motion.div
        className="relative z-10 w-full max-w-[320px] rounded-2xl bg-cave-rock border border-cave-ash p-5"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <h3 className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] mb-4">
          Report Flyer
        </h3>

        <div className="flex flex-col gap-2 mb-4">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setSelectedReason(reason)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                selectedReason === reason
                  ? "bg-cave-white text-cave-black"
                  : "bg-cave-stone text-cave-fog border border-cave-ash hover:border-cave-fog"
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-neon-pink mb-3">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-full border border-cave-ash px-4 py-2 text-xs text-cave-fog font-[family-name:var(--font-space-mono)] hover:text-cave-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="flex-1 min-h-[44px] rounded-full bg-cave-white text-cave-black px-4 py-2 text-xs font-[family-name:var(--font-space-mono)] disabled:opacity-50 hover:bg-cave-light transition-colors"
          >
            {submitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
