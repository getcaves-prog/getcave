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
import { getCategories, setFlyerCategories } from "@/features/canvas/services/categories.service";
import type { Category } from "@/features/canvas/services/categories.service";
import type { GeocodingResult } from "@/shared/lib/geocoding/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 4096;

const flyerSchema = z.object({
  image: z.instanceof(File, { message: "Image is required" }),
  address: z.string().min(1, "Address is required"),
});

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Invalid format. Accepted: JPG, PNG, WebP, GIF, HEIC`;
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
        resolve(`Image too large. Max ${MAX_DIMENSION}x${MAX_DIMENSION}px (yours: ${img.width}x${img.height})`);
      } else if (img.width < 200 || img.height < 200) {
        resolve(`Image too small. Min 200x200px (yours: ${img.width}x${img.height})`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve("Could not read image");
    img.src = URL.createObjectURL(file);
  });
}

async function convertToWebp(file: File, quality = 0.85): Promise<File> {
  // If already webp, return as-is
  if (file.type === "image/webp") return file;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
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
    img.onerror = () => reject(new Error("Failed to load image for conversion"));
    img.src = URL.createObjectURL(file);
  });
}

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

  const [durationDays, setDurationDays] = useState(30);
  const [imageInfo, setImageInfo] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate type and size
      const typeError = validateImageFile(file);
      if (typeError) {
        setErrors((prev) => ({ ...prev, image: typeError }));
        return;
      }

      // Validate dimensions
      const dimError = await validateImageDimensions(file);
      if (dimError) {
        setErrors((prev) => ({ ...prev, image: dimError }));
        return;
      }

      // Convert to WebP
      setConverting(true);
      setErrors((prev) => ({ ...prev, image: "" }));

      try {
        const webpFile = await convertToWebp(file, 0.85);
        setImageFile(webpFile);

        const savedKb = Math.max(0, file.size - webpFile.size);
        const info = `${webpFile.name} · ${(webpFile.size / 1024).toFixed(0)}KB`;
        const savings = savedKb > 1024 ? ` · saved ${(savedKb / 1024).toFixed(0)}KB` : "";
        setImageInfo(info + savings);

        const reader = new FileReader();
        reader.onload = (ev) => {
          setImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(webpFile);
      } catch {
        // Fallback to original file
        setImageFile(file);
        setImageInfo(`${file.name} · ${(file.size / 1024).toFixed(0)}KB`);

        const reader = new FileReader();
        reader.onload = (ev) => {
          setImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setConverting(false);
      }
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

  const [locatingMe, setLocatingMe] = useState(false);

  const handleUseMyLocation = useCallback(async () => {
    // If we already have coords in store, use them
    if (latitude && longitude) {
      setLocatingMe(true);
      setSelectedCoords({ lat: latitude, lng: longitude });
      const { reverseGeocode } = await import(
        "@/shared/lib/geocoding/geocoding.service"
      );
      const result = await reverseGeocode({ lat: latitude, lng: longitude });
      if (result) setAddress(result.address);
      setLocatingMe(false);
      return;
    }

    // Otherwise request browser geolocation directly
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, address: "Geolocation not supported" }));
      return;
    }

    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedCoords({ lat, lng });
        useLocationStore.getState().setLocation(lat, lng);

        const { reverseGeocode } = await import(
          "@/shared/lib/geocoding/geocoding.service"
        );
        const result = await reverseGeocode({ lat, lng });
        if (result) setAddress(result.address);
        setLocatingMe(false);
      },
      (err) => {
        setErrors((prev) => ({ ...prev, address: `Location error: ${err.message}` }));
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [latitude, longitude]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (prev.length >= 3) return prev; // Max 3 categories
      return [...prev, categoryId];
    });
  }, []);

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
      const fileName = `${Date.now()}-${file.name.replace(/\.[^.]+$/, ".webp")}`;

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

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const { data: insertedFlyer, error: insertError } = await supabase.from("flyers").insert({
        image_url: publicUrl,
        title: title.trim() || null,
        address,
        location: locationEwkt,
        status: "pending",
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        duration_days: durationDays,
      }).select("id").single();

      if (insertError) {
        setSubmitError(`Failed to save flyer: ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      // Save categories for the flyer
      if (insertedFlyer && selectedCategories.length > 0) {
        try {
          await setFlyerCategories(insertedFlyer.id, selectedCategories);
        } catch {
          // Non-blocking — flyer still saved
        }
      }

      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setSubmitting(false);
    }
  }, [imageFile, address, selectedCoords, title, user, onClose, durationDays, selectedCategories]);

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
        accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        onChange={handleImageSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative w-full aspect-[4/5] rounded-xl border-2 border-dashed border-cave-fog/40 hover:border-cave-fog bg-cave-rock flex flex-col items-center justify-center gap-3 overflow-hidden transition-colors mb-4"
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
      {converting && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 border border-cave-fog border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-cave-fog">Converting to WebP...</span>
        </div>
      )}
      {imageInfo && !converting && (
        <p className="text-xs text-cave-fog mb-2 font-[family-name:var(--font-space-mono)]">{imageInfo}</p>
      )}
      {errors.image && (
        <p className="text-xs text-red-400 mb-2">{errors.image}</p>
      )}
      <p className="text-[10px] text-cave-smoke mb-4 font-[family-name:var(--font-space-mono)]">
        JPG, PNG, WebP, GIF, HEIC · Max 10MB · 200–4096px
      </p>

      {/* Title */}
      <div className="mb-4">
        <Input
          label="Title (optional)"
          placeholder="Event name or description"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-cave-fog mb-2 font-[family-name:var(--font-space-mono)]">
            Categories (max 3)
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-[family-name:var(--font-space-mono)] transition-colors ${
                    isSelected
                      ? "bg-cave-white text-cave-black border border-cave-white"
                      : "bg-cave-stone text-cave-fog border border-cave-ash hover:border-cave-fog"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locatingMe}
        className="flex items-center gap-2 text-sm text-cave-fog hover:text-cave-white transition-colors mb-4 disabled:opacity-50"
      >
        {locatingMe ? (
          <div className="w-3.5 h-3.5 border border-cave-fog border-t-transparent rounded-full animate-spin" />
        ) : (
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
        )}
        {locatingMe ? "Getting location..." : "Use my location"}
      </button>

      {/* Selected coordinates */}
      {selectedCoords && (
        <p className="text-xs text-cave-smoke mb-4 font-[family-name:var(--font-space-mono)]">
          {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
        </p>
      )}

      {/* Duration picker */}
      <div className="mb-4">
        <p className="text-xs text-cave-fog mb-2 font-[family-name:var(--font-space-mono)]">
          Duration
        </p>
        <div className="flex gap-2">
          {([7, 15, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDurationDays(days)}
              className={`flex-1 py-2 rounded-full text-sm font-[family-name:var(--font-space-mono)] transition-colors ${
                durationDays === days
                  ? "bg-cave-white text-cave-black"
                  : "bg-cave-stone text-cave-fog border border-cave-ash hover:border-cave-fog"
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

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
