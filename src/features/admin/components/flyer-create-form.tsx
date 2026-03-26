"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { z } from "zod";
import { createFlyer } from "@/features/admin/services/admin.service";
import {
  autocomplete,
  reverseGeocode,
} from "@/shared/lib/geocoding/geocoding.service";
import { useLocationStore } from "@/shared/stores/location.store";
import type { GeocodingResult } from "@/shared/lib/geocoding/types";

interface FlyerCreateFormProps {
  onCreated: () => void;
}

const createFlyerSchema = z.object({
  image_url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  address: z.string().min(1, "Address is required"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof createFlyerSchema>, string>>;

export function FlyerCreateForm({ onCreated }: FlyerCreateFormProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
    setLatitude(null);
    setLongitude(null);
    setFieldErrors((prev) => ({ ...prev, address: undefined }));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocomplete(value, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  }, []);

  const handleSelectSuggestion = useCallback((result: GeocodingResult) => {
    setAddress(result.address);
    setLatitude(result.lat);
    setLongitude(result.lng);
    setSuggestions([]);
    setShowSuggestions(false);
    setFieldErrors((prev) => ({ ...prev, address: undefined }));
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    const { latitude: storeLat, longitude: storeLng } =
      useLocationStore.getState();

    if (storeLat === null || storeLng === null) {
      setError("Location not available. Please enable location services.");
      return;
    }

    setReverseGeocoding(true);
    setError(null);

    try {
      const result = await reverseGeocode({ lat: storeLat, lng: storeLng });

      if (result) {
        setAddress(result.address);
        setLatitude(storeLat);
        setLongitude(storeLng);
        setFieldErrors((prev) => ({ ...prev, address: undefined }));
      } else {
        setError("Could not determine address from your location.");
      }
    } catch {
      setError("Failed to reverse geocode your location.");
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = createFlyerSchema.safeParse({
      image_url: imageUrl,
      title,
      address,
    });

    if (!result.success) {
      const errors: FieldErrors = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }

      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      await createFlyer({
        image_url: result.data.image_url,
        title: result.data.title,
        address: result.data.address,
        status: "approved",
        ...(latitude !== null && longitude !== null
          ? { latitude, longitude }
          : {}),
      });
      setImageUrl("");
      setTitle("");
      setAddress("");
      setLatitude(null);
      setLongitude(null);
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create flyer"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-cave-ash bg-cave-stone p-6"
    >
      <h3 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
        Create Flyer
      </h3>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Image URL */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
            Image URL
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setFieldErrors((prev) => ({ ...prev, image_url: undefined }));
            }}
            placeholder="https://..."
            className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
          />
          {fieldErrors.image_url && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-red-400">
              {fieldErrors.image_url}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="Event title"
            className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
          />
          {fieldErrors.title && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-red-400">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Address with autocomplete */}
        <div className="relative" ref={suggestionsRef}>
          <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
            Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Venue address"
              className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={reverseGeocoding}
              title="Use my location"
              className="flex-shrink-0 rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-fog transition-colors hover:border-cave-fog hover:text-cave-white disabled:opacity-50"
            >
              {reverseGeocoding ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cave-fog border-t-transparent" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.address && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-red-400">
              {fieldErrors.address}
            </p>
          )}

          {/* Coordinates indicator */}
          {latitude !== null && longitude !== null && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-smoke">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-cave-ash bg-cave-rock shadow-lg">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.lat}-${suggestion.lng}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="block w-full px-3 py-2 text-left text-sm text-cave-fog transition-colors hover:bg-cave-stone hover:text-cave-white first:rounded-t-xl last:rounded-b-xl"
                >
                  {suggestion.address}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 font-[family-name:var(--font-space-mono)] text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-cave-white px-6 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
