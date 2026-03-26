import type { Tables } from "@/shared/types/database.types";

export type Flyer = Tables<"flyers">;
export type Profile = Tables<"profiles">;

/** @deprecated Use Flyer instead */
export type Event = Flyer;

export type FlyerStatus = "pending" | "approved" | "rejected";
/** @deprecated Use FlyerStatus instead */
export type EventStatus = FlyerStatus;
export type UserRole = "admin" | "user" | "lector";

export interface AdminStats {
  totalFlyers: number;
  pendingFlyers: number;
  totalUsers: number;
}

export interface CreateFlyerPayload {
  image_url: string;
  title: string;
  address: string;
  status: string;
  latitude?: number;
  longitude?: number;
}

/** @deprecated Use CreateFlyerPayload instead */
export type CreateEventPayload = CreateFlyerPayload;
