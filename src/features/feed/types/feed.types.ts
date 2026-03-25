import type { Database } from "@/shared/types/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export interface FeedEvent extends Omit<EventRow, "location" | "heat_count"> {
  location: string;
  category_name: string;
  category_slug: string;
  distance_meters: number;
  heat_count: number;
}

export interface FeedState {
  events: FeedEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentIndex: number;
}

export interface PositionedEvent extends FeedEvent {
  x: number;
  y: number;
  rotation: number;
  scale?: number;
}
