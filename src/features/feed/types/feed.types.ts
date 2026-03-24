import type { Database } from "@/shared/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export interface FeedEvent extends Omit<EventRow, "location"> {
  location: string;
  category_name: string;
  category_slug: string;
  distance_meters: number;
}

export interface FeedState {
  events: FeedEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentIndex: number;
}
