import { create } from "zustand";
import type { DisplayMode } from "../types/canvas.types";

interface DisplayModeState {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
}

export const useDisplayModeStore = create<DisplayModeState>((set) => ({
  mode: "canvas",
  setMode: (mode) => set({ mode }),
}));
