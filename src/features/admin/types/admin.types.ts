import type { Tables } from "@/shared/types/database.types";

export type Event = Tables<"events">;
export type Profile = Tables<"profiles">;

export type EventStatus = "pending" | "approved" | "rejected";
export type UserRole = "admin" | "user" | "lector";

export interface AdminStats {
  totalFlyers: number;
  pendingFlyers: number;
  totalUsers: number;
}

export interface CreateEventPayload {
  image_url: string;
  title: string;
  address: string;
  status: string;
  latitude?: number;
  longitude?: number;
}
