"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Lowercase letters, numbers, and underscores only"
    ),
  bio: z.string().max(200, "Bio must be at most 200 characters").optional(),
  city: z.string().max(100).optional(),
});

interface ProfileEditModalProps {
  onBack: () => void;
  onClose: () => void;
}

export function ProfileEditModal({ onBack, onClose }: ProfileEditModalProps) {
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile data on mount
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, city, avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setCity(data.city || "");
        setAvatarUrl(data.avatar_url);
      }

      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleAvatarSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaveError(null);

    const validation = profileSchema.safeParse({
      username,
      bio: bio || undefined,
      city: city || undefined,
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

    if (!user) return;

    setSaving(true);

    try {
      const supabase = createClient();
      let newAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const fileName = `${user.id}-${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { contentType: avatarFile.type });

        if (uploadError) {
          setSaveError(`Avatar upload failed: ${uploadError.message}`);
          setSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName);

        newAvatarUrl = publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username,
          bio: bio || null,
          city: city || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        setSaveError(`Failed to save profile: ${updateError.message}`);
        setSaving(false);
        return;
      }

      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setSaving(false);
    }
  }, [username, bio, city, avatarFile, avatarUrl, user, onClose]);

  const displayAvatar = avatarPreview || avatarUrl;

  if (loading) {
    return (
      <motion.div
        className="relative z-10 flex items-center justify-center w-full max-w-[420px] h-64 rounded-2xl bg-cave-rock border border-cave-ash"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="w-6 h-6 border-2 border-cave-fog border-t-cave-white rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative z-10 flex flex-col w-full max-w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl bg-cave-rock border border-cave-ash p-6 scrollbar-hide"
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
          My Profile
        </h2>
      </div>

      {/* Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarSelect}
        className="hidden"
      />

      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-cave-ash hover:border-cave-fog transition-colors group"
          aria-label="Change avatar"
        >
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt="Avatar"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-cave-stone flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cave-smoke"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}

          {/* Camera overlay */}
          <div className="absolute inset-0 bg-cave-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cave-white"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </button>
      </div>

      {/* Username */}
      <div className="mb-4">
        <Input
          label="Username"
          placeholder="your_username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase());
            setErrors((prev) => ({ ...prev, username: "" }));
          }}
          error={errors.username}
        />
      </div>

      {/* City */}
      <div className="mb-4">
        <Input
          label="City (optional)"
          placeholder="Your city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          error={errors.city}
        />
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-sm text-cave-fog font-[family-name:var(--font-space-mono)]">
          Bio (optional)
        </label>
        <textarea
          placeholder="Tell people about yourself..."
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setErrors((prev) => ({ ...prev, bio: "" }));
          }}
          maxLength={200}
          rows={3}
          className="w-full rounded-xl bg-cave-ash px-4 py-3 text-cave-light placeholder:text-cave-smoke border border-cave-rock focus:border-neon-green focus:ring-2 focus:ring-neon-green/20 focus:outline-none transition-colors resize-none"
        />
        <div className="flex justify-between">
          {errors.bio && (
            <p className="text-xs text-neon-pink">{errors.bio}</p>
          )}
          <p className="text-xs text-cave-smoke ml-auto">
            {bio.length}/200
          </p>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-xs text-neon-pink mb-4">{saveError}</p>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-full bg-cave-white text-cave-black hover:bg-cave-light"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </motion.div>
  );
}
