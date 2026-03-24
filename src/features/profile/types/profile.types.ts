import type { Database } from "@/shared/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];

export interface ProfileWithEvents extends ProfileRow {
  events: (EventRow & {
    categories: { name: string; icon: string | null } | null;
  })[];
}
