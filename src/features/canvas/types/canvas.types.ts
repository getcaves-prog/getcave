import type { Tables } from "@/shared/types/database.types";

export type Flyer = Tables<"flyers">;

/** Flyer returned by nearby_flyers RPC — includes zone and distance */
export type NearbyFlyer = Flyer & {
  event_date: string | null;
  event_time: string | null;
  zone_name: string | null;
  distance_m: number;
};

/** Flyer returned by nearby_flyers_scored RPC — includes weighted score fields */
export type ScoredFlyer = NearbyFlyer & {
  distance_score: number;
  time_score: number;
  interaction_score: number;
  total_score: number;
};

/** Determines how flyers are displayed based on result count */
export type DisplayMode = "canvas" | "grid" | "empty";

/** A flyer with client-side computed grid position and size */
export interface LayoutFlyer extends NearbyFlyer {
  /** Grid position key for React rendering (e.g. "3,5") */
  grid_id: string;
  /** Computed x position on canvas */
  layout_x: number;
  /** Computed y position on canvas */
  layout_y: number;
  /** Computed display width */
  layout_width: number;
  /** Computed display height */
  layout_height: number;
  /** Computed rotation in degrees */
  layout_rotation: number;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Viewport {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Grid layout configuration per breakpoint */
export interface GridConfig {
  columns: number;
  rows: number;
  flyerWidth: number;
  flyerHeight: number;
  gap: number;
}

export const GRID_CONFIG = {
  desktop: {
    columns: 30,
    rows: 3,
    flyerWidth: 280,
    flyerHeight: 400,
    gap: 0,
  },
  mobile: {
    columns: 20,
    rows: 3,
    flyerWidth: 160,
    flyerHeight: 230,
    gap: 0,
  },
} as const satisfies Record<string, GridConfig>;

/** Breakpoint for mobile vs desktop */
export const MOBILE_BREAKPOINT = 768;

export const CANVAS_LIMITS = {
  MIN_SCALE: 0.3,
  MAX_SCALE: 3,
  HEADER_HEIGHT: 56,
} as const;
