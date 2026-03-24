"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/features/auth/services/auth.service";
import { OAuthButton } from "@/features/auth/components/oauth-button";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    const result = await signUp({ email, password, username });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.requiresConfirmation) {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold text-white">Revisa tu correo</h1>
        <p className="text-sm text-[#A0A0A0]">
          Te enviamos un enlace de confirmacion. Revisa tu bandeja de entrada
          para activar tu cuenta.
        </p>
        <Link
          href="/auth/login"
          className="text-sm text-[#FF4D4D] hover:underline"
        >
          Volver al inicio de sesion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
        <p className="text-sm text-[#A0A0A0]">
          Unete a Caves y descubre eventos cerca de ti
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="username"
          type="text"
          label="Nombre de usuario"
          placeholder="tuusuario"
          required
          autoComplete="username"
        />
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
          placeholder="Minimo 6 caracteres"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" /> : "Crear cuenta"}
        </Button>
      </form>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-[#2A2A2A]" />
        <span className="text-xs text-[#A0A0A0]">o</span>
        <div className="h-px flex-1 bg-[#2A2A2A]" />
      </div>

      <OAuthButton />

      <p className="text-center text-sm text-[#A0A0A0]">
        Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="text-[#FF4D4D] hover:underline">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}
