/**
 * Flyer sizing constants for FlyerBoard
 * All flyers maintain a 2:3 portrait aspect ratio
 */

export const FLYER_SIZES = {
  mobile: { width: 120, height: 180 },
  desktop: { width: 180, height: 270 },
} as const;

export const FLYER_GAP = {
  mobile: { x: 16, y: 24 },
  desktop: { x: 24, y: 32 },
} as const;

export const FLYER_OFFSET = {
  mobile: { x: 20, y: 15 },
  desktop: { x: 30, y: 20 },
} as const;

export const FLYER_ROTATION = {
  mobile: 4, // max degrees
  desktop: 6,
} as const;

export const CARDS_PER_ROW = {
  mobile: 4,
  desktop: 6,
} as const;

export const BREAKPOINT_MOBILE = 768;

/** Aspect ratio: width / height = 2/3 */
export const FLYER_ASPECT_RATIO = 2 / 3;
