"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { cn } from "@/shared/lib/utils/cn";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1920;
const COMPRESSION_QUALITY = 0.8;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        COMPRESSION_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function ImageUpload({ value, onChange, error }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>(value || "");
  const [uploadError, setUploadError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError("");

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Solo se permiten imagenes JPG, PNG o WebP");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("La imagen no debe superar 5MB");
        return;
      }

      // Show preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      setIsUploading(true);
      setUploadProgress(10);

      try {
        // Compress image
        setUploadProgress(30);
        const compressed = await compressImage(file);
        setUploadProgress(50);

        // Get user for file path
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUploadError("Debes iniciar sesion para subir imagenes");
          setIsUploading(false);
          return;
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${user.id}/${timestamp}_${safeName}`;

        setUploadProgress(60);

        const { error: storageError } = await supabase.storage
          .from("flyers")
          .upload(filePath, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (storageError) {
          setUploadError(`Error al subir: ${storageError.message}`);
          setIsUploading(false);
          return;
        }

        setUploadProgress(90);

        const {
          data: { publicUrl },
        } = supabase.storage.from("flyers").getPublicUrl(filePath);

        setUploadProgress(100);
        setPreviewUrl(publicUrl);
        onChange(publicUrl);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Error al subir la imagen"
        );
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(localPreview);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const displayError = uploadError || error;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-[#A0A0A0]">Flyer del evento</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors aspect-[16/9]",
          isDragging
            ? "border-[#FF4D4D] bg-[#FF4D4D]/10"
            : "border-[#3A3A3A] bg-[#1A1A1A] hover:border-[#FF4D4D]/50",
          displayError && "border-red-500"
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview del flyer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <svg
              className="h-10 w-10 text-[#666]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
            <p className="text-sm text-[#A0A0A0]">
              Arrastra tu flyer aqui o toca para seleccionar
            </p>
            <p className="text-xs text-[#666]">JPG, PNG o WebP. Max 5MB</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <div className="mb-2 h-1.5 w-3/4 overflow-hidden rounded-full bg-[#2A2A2A]">
              <div
                className="h-full rounded-full bg-[#FF4D4D] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-[#A0A0A0]">
              Subiendo... {uploadProgress}%
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Subir imagen del flyer"
        />
      </div>
      {displayError && <p className="text-xs text-red-500">{displayError}</p>}
    </div>
  );
}
