import Image from "next/image";
import Link from "next/link";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils/cn";
import type { Database } from "@/shared/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface UserEventCardProps {
  event: EventRow & {
    categories: { name: string; icon: string | null } | null;
  };
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-500/20 text-green-400" },
  draft: { label: "Borrador", className: "bg-yellow-500/20 text-yellow-400" },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-500/20 text-red-400",
  },
  past: { label: "Pasado", className: "bg-[#2A2A2A] text-[#666]" },
};

function formatEventDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UserEventCard({ event }: UserEventCardProps) {
  const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.past;

  return (
    <Link href={`/event/${event.id}`}>
      <Card className="flex items-center gap-3 active:scale-[0.98] transition-transform">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#2A2A2A]">
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold">{event.title}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                statusStyle.className
              )}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#A0A0A0]">
            {formatEventDate(event.date)}
          </p>
          <p className="truncate text-xs text-[#666]">{event.venue_name}</p>
        </div>
      </Card>
    </Link>
  );
}
