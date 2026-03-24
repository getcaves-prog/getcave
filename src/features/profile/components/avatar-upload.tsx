"use client";

import Image from "next/image";
import { useRef, useState, useCallback } from "react";
import { uploadAvatar } from "@/features/profile/services/profile.service";

interface AvatarUploadProps {
  currentUrl: string | null;
  username: string;
  onUploaded: (url: string) => void;
}

function getInitials(username: string): string {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const maxSize = 512;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

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
          if (blob) resolve(blob);
          else reject(new Error("Could not compress image"));
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

export function AvatarUpload({
  currentUrl,
  username,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten imágenes");
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        setPreview(previewUrl);

        const formData = new FormData();
        formData.append(
          "avatar",
          new File([compressed], "avatar.webp", { type: "image/webp" })
        );

        const result = await uploadAvatar(formData);

        if (result.error) {
          setError(result.error);
          setPreview(currentUrl);
        } else if (result.url) {
          onUploaded(result.url);
        }
      } catch {
        setError("Error al subir la imagen");
        setPreview(currentUrl);
      } finally {
        setUploading(false);
      }
    },
    [currentUrl, onUploaded]
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-[120px] w-[120px] overflow-hidden rounded-full bg-[#2A2A2A] transition-opacity disabled:opacity-50"
        aria-label="Cambiar foto de perfil"
      >
        {preview ? (
          <Image
            src={preview}
            alt={username}
            fill
            className="object-cover"
            sizes="120px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#A0A0A0]">
            {getInitials(username)}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm font-medium text-white">
            {uploading ? "Subiendo..." : "Cambiar"}
          </span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <p className="text-xs text-[#666]">
        Toca para cambiar tu foto de perfil
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
