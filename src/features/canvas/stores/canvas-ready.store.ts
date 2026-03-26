import { create } from "zustand";

interface CanvasReadyState {
  /** Whether flyer data has been fetched */
  flyersLoaded: boolean;
  /** Count of images that have finished loading */
  imagesLoadedCount: number;
  /** Whether the canvas is considered ready to display */
  ready: boolean;
  /** Mark flyers as loaded and recompute readiness */
  setFlyersLoaded: () => void;
  /** Increment image load count and recompute readiness */
  incrementImagesLoaded: () => void;
  /** Reset state (e.g., when location changes and flyers refetch) */
  reset: () => void;
}

/** Minimum images loaded before we consider the canvas "ready" */
const MIN_IMAGES_FOR_READY = 1;

function computeReady(flyersLoaded: boolean, imagesLoadedCount: number): boolean {
  return flyersLoaded && imagesLoadedCount >= MIN_IMAGES_FOR_READY;
}

export const useCanvasReadyStore = create<CanvasReadyState>((set) => ({
  flyersLoaded: false,
  imagesLoadedCount: 0,
  ready: false,

  setFlyersLoaded: () =>
    set((state) => {
      const ready = computeReady(true, state.imagesLoadedCount);
      return { flyersLoaded: true, ready };
    }),

  incrementImagesLoaded: () =>
    set((state) => {
      const count = state.imagesLoadedCount + 1;
      const ready = computeReady(state.flyersLoaded, count);
      return { imagesLoadedCount: count, ready };
    }),

  reset: () =>
    set({ flyersLoaded: false, imagesLoadedCount: 0, ready: false }),
}));
