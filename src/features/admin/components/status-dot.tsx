import type { EventStatus } from "@/features/admin/types/admin.types";

interface StatusDotProps {
  status: string;
}

const STATUS_STYLES: Record<EventStatus, string> = {
  approved: "bg-cave-white",
  rejected: "bg-cave-fog",
  pending: "border border-cave-fog bg-transparent",
};

export function StatusDot({ status }: StatusDotProps) {
  const style = STATUS_STYLES[status as EventStatus] ?? STATUS_STYLES.pending;

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${style}`} />
      <span className="font-[family-name:var(--font-space-mono)] text-xs capitalize text-cave-fog">
        {status}
      </span>
    </span>
  );
}
