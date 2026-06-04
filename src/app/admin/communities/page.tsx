"use client";

import { TransferOwnershipPanel } from "@/features/admin/components/transfer-ownership-panel";

export default function AdminCommunitiesPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="font-[family-name:var(--font-space-mono)] text-xl font-bold text-cave-white tracking-tight">
          Transferir propiedad
        </h1>
        <p className="mt-1.5 text-sm text-cave-fog font-[family-name:var(--font-inter)] leading-5 max-w-lg">
          Transferí la propiedad de una comunidad sembrada a su dueño real. La comunidad dejará de estar marcada como no oficial y el nuevo owner podrá gestionarla normalmente.
        </p>
      </div>

      <div className="h-px bg-cave-ash/20" />

      <TransferOwnershipPanel />
    </div>
  );
}
