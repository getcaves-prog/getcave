"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/features/auth/services/auth.service";
import { OAuthButton } from "@/features/auth/components/oauth-button";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn({ email, password });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-5xl font-bold text-[#FF4D4D] font-[family-name:var(--font-space-grotesk)]">
          Caves
        </h1>
        <p className="text-sm text-[#A0A0A0]">
          Discover what&apos;s happening around you
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          label="Correo electronico"
          placeholder="tu@email.com"
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          label="Contrasena"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" /> : "Iniciar sesion"}
        </Button>
      </form>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-[#2A2A2A]" />
        <span className="text-xs text-[#A0A0A0]">o</span>
        <div className="h-px flex-1 bg-[#2A2A2A]" />
      </div>

      <OAuthButton />

      <p className="text-center text-sm text-[#A0A0A0]">
        No tienes cuenta?{" "}
        <Link href="/auth/signup" className="text-[#FF4D4D] hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
