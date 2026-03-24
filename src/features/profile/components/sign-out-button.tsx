"use client";

import { Button } from "@/shared/components/ui/button";
import { signOut } from "@/features/auth/services/auth.service";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut()}>
      Cerrar sesión
    </Button>
  );
}
