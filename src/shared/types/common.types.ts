export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export type EventStatus = "draft" | "active" | "cancelled" | "past";
export type UserRole = "user" | "promoter";
