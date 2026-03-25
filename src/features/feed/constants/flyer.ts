/**
 * Flyer sizing constants for FlyerBoard
 * All flyers maintain a tall portrait aspect ratio (1:3)
 */

export const FLYER_SIZES = {
  mobile: { width: 100, height: 300 },
  desktop: { width: 140, height: 420 },
} as const;

export const FLYER_GAP = {
  mobile: { x: 20, y: 40 },
  desktop: { x: 30, y: 60 },
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
  mobile: 3,
  desktop: 5,
} as const;

export const BREAKPOINT_MOBILE = 768;

/** Aspect ratio: width / height = 1:3 (tall) */
export const FLYER_ASPECT_RATIO = 1 / 3;
