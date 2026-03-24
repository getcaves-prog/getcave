"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { updateProfile } from "@/features/profile/services/profile.service";
import type { Database } from "@/shared/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface EditProfileFormProps {
  profile: Profile;
}

interface FormState {
  error: string | null;
}

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");

  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      formData.set("avatar_url", avatarUrl);
      const result = await updateProfile(formData);
      if (result?.error) return { error: result.error };
      return { error: null };
    },
    { error: null }
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <AvatarUpload
        currentUrl={profile.avatar_url}
        username={profile.username}
        onUploaded={setAvatarUrl}
      />

      <Input
        name="username"
        label="Nombre de usuario"
        defaultValue={profile.username}
        required
        minLength={2}
        maxLength={50}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm text-[#A0A0A0]">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          maxLength={160}
          rows={3}
          placeholder="Cuéntanos algo sobre ti..."
          className="w-full resize-none rounded-xl bg-[#2A2A2A] px-4 py-3 text-white placeholder:text-[#666] border border-transparent focus:border-[#FF4D4D] focus:outline-none transition-colors"
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/profile" className="flex-1">
          <Button type="button" variant="secondary" className="w-full">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
