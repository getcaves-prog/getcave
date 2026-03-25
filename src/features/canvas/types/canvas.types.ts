import type { Tables } from "@/shared/types/database.types";

export type Flyer = Tables<"flyers">;

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

export const CANVAS_LIMITS = {
  MIN_SCALE: 0.3,
  MAX_SCALE: 3,
  HEADER_HEIGHT: 56,
} as const;
