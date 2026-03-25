"use client";

import { useCallback, useState } from "react";

interface CanvasState {
  position: { x: number; y: number };
  scale: number;
  focusedFlyer: string | null;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

export function useCanvas() {
  const [state, setState] = useState<CanvasState>({
    position: { x: 0, y: 0 },
    scale: 1,
    focusedFlyer: null,
  });

  const pan = useCallback((dx: number, dy: number) => {
    setState((prev) => ({
      ...prev,
      position: {
        x: prev.position.x + dx,
        y: prev.position.y + dy,
      },
    }));
  }, []);

  const setPosition = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      position: { x, y },
    }));
  }, []);

  const zoom = useCallback((newScale: number) => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)),
    }));
  }, []);

  const focusFlyer = useCallback((flyerId: string) => {
    setState((prev) => ({
      ...prev,
      focusedFlyer: flyerId,
    }));
  }, []);

  const clearFocus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      focusedFlyer: null,
    }));
  }, []);

  const resetView = useCallback(() => {
    setState({
      position: { x: 0, y: 0 },
      scale: 1,
      focusedFlyer: null,
    });
  }, []);

  return {
    position: state.position,
    scale: state.scale,
    focusedFlyer: state.focusedFlyer,
    pan,
    setPosition,
    zoom,
    focusFlyer,
    clearFocus,
    resetView,
  };
}
