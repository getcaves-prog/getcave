"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/client";
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

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 200;

const createFlyerSchema = z.object({
  image: z.instanceof(File, { message: "Image is required" }),
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  address: z.string().min(1, "Address is required"),
});

type FieldErrors = Partial<Record<"image" | "title" | "address", string>>;

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Invalid format. Accepted: JPG, PNG, WebP, GIF, HEIC";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

function validateImageDimensions(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(
          `Image too large. Max ${MAX_DIMENSION}x${MAX_DIMENSION}px (yours: ${img.width}x${img.height})`
        );
      } else if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve(
          `Image too small. Min ${MIN_DIMENSION}x${MIN_DIMENSION}px (yours: ${img.width}x${img.height})`
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve("Could not read image");
    img.src = URL.createObjectURL(file);
  });
}

async function convertToWebp(file: File, quality = 0.85): Promise<File> {
  if (file.type === "image/webp") return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp" }
          );
          resolve(webpFile);
        },
        "image/webp",
        quality
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export function FlyerCreateForm({ onCreated }: FlyerCreateFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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

  const processFile = useCallback(async (file: File) => {
    // Validate type and size
    const typeError = validateImageFile(file);
    if (typeError) {
      setFieldErrors((prev) => ({ ...prev, image: typeError }));
      return;
    }

    // Validate dimensions
    const dimError = await validateImageDimensions(file);
    if (dimError) {
      setFieldErrors((prev) => ({ ...prev, image: dimError }));
      return;
    }

    // Convert to WebP
    setConverting(true);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));

    try {
      const webpFile = await convertToWebp(file, 0.85);
      setImageFile(webpFile);

      const savedKb = Math.max(0, file.size - webpFile.size);
      const info = `${webpFile.name} \u00B7 ${(webpFile.size / 1024).toFixed(0)}KB`;
      const savings =
        savedKb > 1024
          ? ` \u00B7 saved ${(savedKb / 1024).toFixed(0)}KB`
          : "";
      setImageInfo(info + savings);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(webpFile);
    } catch {
      setImageFile(file);
      setImageInfo(
        `${file.name} \u00B7 ${(file.size / 1024).toFixed(0)}KB`
      );
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setConverting(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setImageInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      image: imageFile,
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
      // Upload to Supabase storage
      const supabase = createClient();
      const file = imageFile!;
      const fileName = `${Date.now()}-${file.name.replace(/\.[^.]+$/, ".webp")}`;

      const { error: uploadError } = await supabase.storage
        .from("flyers")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("flyers").getPublicUrl(fileName);

      // Create flyer with the uploaded image URL
      await createFlyer({
        image_url: publicUrl,
        title: result.data.title,
        address: result.data.address,
        status: "approved",
        ...(latitude !== null && longitude !== null
          ? { latitude, longitude }
          : {}),
      });

      // Reset form
      setImageFile(null);
      setImagePreview(null);
      setImageInfo(null);
      setTitle("");
      setAddress("");
      setLatitude(null);
      setLongitude(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      className="mb-6 rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6"
    >
      <h3 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
        Create Flyer
      </h3>

      <div className="space-y-4">
        {/* Image upload */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
            Image
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Flyer preview"
                className="max-h-64 w-full rounded-xl object-contain"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-cave-black/70 text-cave-white transition-colors hover:bg-cave-black"
                aria-label="Remove image"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
                dragging
                  ? "border-cave-fog bg-cave-rock/80"
                  : "border-cave-ash bg-cave-rock hover:border-cave-fog"
              }`}
            >
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
              <span className="font-[family-name:var(--font-space-mono)] text-sm text-cave-fog">
                Drop image here or tap to browse
              </span>
              <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
                JPG, PNG, WebP, GIF, HEIC &middot; Max 10MB &middot;
                200&ndash;4096px
              </span>
            </button>
          )}

          {converting && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border border-cave-fog border-t-transparent" />
              <span className="text-xs text-cave-fog">
                Converting to WebP...
              </span>
            </div>
          )}
          {imageInfo && !converting && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
              {imageInfo}
            </p>
          )}
          {fieldErrors.image && (
            <p className="mt-1 font-[family-name:var(--font-space-mono)] text-xs text-red-400">
              {fieldErrors.image}
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
          className="min-h-[44px] rounded-full bg-cave-white px-6 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Uploading..." : "Create"}
        </button>
      </div>
    </form>
  );
}
