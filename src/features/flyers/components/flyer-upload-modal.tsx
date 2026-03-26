"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/client";
import { autocomplete } from "@/shared/lib/geocoding/geocoding.service";
import { useLocationStore } from "@/shared/stores/location.store";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { GeocodingResult } from "@/shared/lib/geocoding/types";

const flyerSchema = z.object({
  image: z.instanceof(File, { message: "Image is required" }),
  address: z.string().min(1, "Address is required"),
});

interface FlyerUploadModalProps {
  onBack: () => void;
  onClose: () => void;
}

export function FlyerUploadModal({ onBack, onClose }: FlyerUploadModalProps) {
  const { user } = useAuth();
  const { latitude, longitude } = useLocationStore();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: "" }));

      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setAddress(value);
      setErrors((prev) => ({ ...prev, address: "" }));

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const results = await autocomplete(value, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 300);
    },
    []
  );

  const handleSuggestionSelect = useCallback((result: GeocodingResult) => {
    setAddress(result.address);
    setSelectedCoords({ lat: result.lat, lng: result.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    if (latitude && longitude) {
      setSelectedCoords({ lat: latitude, lng: longitude });
      const { reverseGeocode } = await import(
        "@/shared/lib/geocoding/geocoding.service"
      );
      const result = await reverseGeocode({ lat: latitude, lng: longitude });
      if (result) {
        setAddress(result.address);
      }
    }
  }, [latitude, longitude]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);

    const validation = flyerSchema.safeParse({
      image: imageFile,
      address,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0]);
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!selectedCoords) {
      setErrors({ address: "Select an address from suggestions or use your location" });
      return;
    }

    if (!user) return;

    setSubmitting(true);

    try {
      const supabase = createClient();
      const file = imageFile!;
      const fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("flyers")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        setSubmitError(`Upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("flyers").getPublicUrl(fileName);

      const locationEwkt = `SRID=4326;POINT(${selectedCoords.lng} ${selectedCoords.lat})`;

      const { error: insertError } = await supabase.from("flyers").insert({
        image_url: publicUrl,
        title: title.trim() || null,
        address,
        location: locationEwkt,
        status: "pending",
      });

      if (insertError) {
        setSubmitError(`Failed to save flyer: ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setSubmitting(false);
    }
  }, [imageFile, address, selectedCoords, title, user, onClose]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  return (
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
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Back"
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
          Upload Flyer
        </h2>
      </div>

      {/* Image upload area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative w-full aspect-[7/10] rounded-xl border-2 border-dashed border-cave-ash hover:border-cave-fog bg-cave-stone flex flex-col items-center justify-center gap-3 overflow-hidden transition-colors mb-4"
      >
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="Flyer preview"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-fog"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
              Tap to select image
            </span>
          </>
        )}
      </button>
      {errors.image && (
        <p className="text-xs text-neon-pink mb-2">{errors.image}</p>
      )}

      {/* Title */}
      <div className="mb-4">
        <Input
          label="Title (optional)"
          placeholder="Event name or description"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Address */}
      <div className="relative mb-4">
        <Input
          label="Address"
          placeholder="Search for an address..."
          value={address}
          onChange={handleAddressChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          error={errors.address}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl bg-cave-stone border border-cave-ash overflow-hidden shadow-lg">
            {suggestions.map((result, i) => (
              <button
                key={`${result.lat}-${result.lng}-${i}`}
                type="button"
                onClick={() => handleSuggestionSelect(result)}
                className="w-full text-left px-4 py-3 text-sm text-cave-light hover:bg-cave-ash transition-colors border-b border-cave-ash last:border-b-0"
              >
                {result.address}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use my location button */}
      {latitude && longitude && (
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="flex items-center gap-2 text-sm text-cave-fog hover:text-cave-white transition-colors mb-4"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          Use my location
        </button>
      )}

      {/* Selected coordinates */}
      {selectedCoords && (
        <p className="text-xs text-cave-smoke mb-4 font-[family-name:var(--font-space-mono)]">
          {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
        </p>
      )}

      {/* Submit error */}
      {submitError && (
        <p className="text-xs text-neon-pink mb-4">{submitError}</p>
      )}

      {/* Submit button */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full bg-cave-white text-cave-black hover:bg-cave-light"
      >
        {submitting ? "Uploading..." : "Upload"}
      </Button>
    </motion.div>
  );
}
