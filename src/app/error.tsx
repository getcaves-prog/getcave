"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#050505] p-4 text-center">
      <h1 className="font-[family-name:var(--font-space-mono)] text-4xl font-bold text-[#FF2D7B]">
        Algo salió mal
      </h1>
      <p className="max-w-sm text-sm text-[#A0A0A0]">
        {error.digest ? `Error: ${error.digest}` : "Ocurrió un error inesperado."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <Link href="/">
          <Button variant="ghost">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
