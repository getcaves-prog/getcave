import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { UserEventCard } from "@/features/profile/components/user-event-card";
import type { Database } from "@/shared/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface UserEventsListProps {
  events: (EventRow & {
    categories: { name: string; icon: string | null } | null;
  })[];
}

export function UserEventsList({ events }: UserEventsListProps) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
          Mis Eventos
        </h3>
        <span className="rounded-full bg-[#2A2A2A] px-2.5 py-0.5 text-xs text-[#A0A0A0]">
          {events.length}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A2A2A] py-12 text-center">
          <p className="text-[#A0A0A0]">Aún no has publicado eventos</p>
          <p className="mt-1 text-sm text-[#666]">
            Comparte tu primer flyer y llega a más personas
          </p>
          <Link href="/upload" className="mt-4 inline-block">
            <Button size="sm">Subir mi primer flyer</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <UserEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
