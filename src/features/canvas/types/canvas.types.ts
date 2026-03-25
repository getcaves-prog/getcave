import type { Tables } from "@/shared/types/database.types";

export type Flyer = Tables<"flyers">;

/** A flyer with client-side computed grid position and size */
export interface LayoutFlyer extends Flyer {
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
  flyerWidth: number;
  flyerHeight: number;
  gap: number;
}

export const GRID_CONFIG = {
  desktop: {
    columns: 6,
    flyerWidth: 280,
    flyerHeight: 400,
    gap: 0,
  },
  mobile: {
    columns: 3,
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
