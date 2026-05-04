"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function AdminError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-[family-name:var(--font-space-mono)] text-2xl font-bold text-[#FF2D7B]">
        Error en el panel
      </h2>
      <p className="max-w-sm text-sm text-[#A0A0A0]">
        {error.digest ? `Digest: ${error.digest}` : "No se pudo cargar esta sección."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} size="sm">Reintentar</Button>
        <Link href="/admin">
          <Button variant="secondary" size="sm">Ir al inicio del panel</Button>
        </Link>
      </div>
    </div>
  );
}
