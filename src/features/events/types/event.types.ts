import type { Database } from "@/shared/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface EventDetail extends EventRow {
  categories: Pick<CategoryRow, "name" | "slug" | "icon"> | null;
  profiles: Pick<ProfileRow, "username" | "avatar_url"> | null;
}
