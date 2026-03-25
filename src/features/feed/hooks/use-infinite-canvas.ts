"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

interface CanvasState {
  position: Point;
  scale: number;
}

interface Velocity {
  x: number;
  y: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const FRICTION = 0.95;
const VELOCITY_THRESHOLD = 0.5;

export function useInfiniteCanvas() {
  const [state, setState] = useState<CanvasState>({
    position: { x: 0, y: 0 },
    scale: 1,
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Refs for smooth animation
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const velocityRef = useRef<Velocity>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  
  // Touch refs for multitouch
  const touchesRef = useRef<Map<number, Point>>(new Map());
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef(1);
  const initialPinchCenterRef = useRef<Point | null>(null);
  
  // Update refs when state changes externally
  useEffect(() => {
    positionRef.current = state.position;
    scaleRef.current = state.scale;
  }, [state]);

  // Animation loop for momentum
  useEffect(() => {
    const animate = () => {
      if (!isDraggingRef.current) {
        const velocity = velocityRef.current;
        
        if (Math.abs(velocity.x) > VELOCITY_THRESHOLD || Math.abs(velocity.y) > VELOCITY_THRESHOLD) {
          positionRef.current = {
            x: positionRef.current.x + velocity.x,
            y: positionRef.current.y + velocity.y,
          };
          
          velocityRef.current = {
            x: velocity.x * FRICTION,
            y: velocity.y * FRICTION,
          };
          
          setState(prev => ({
            ...prev,
            position: { ...positionRef.current },
          }));
          
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };
    
    if (!isDraggingRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  // Keyboard shortcuts (spacebar for hand tool)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(false);
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Mouse/Touch handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = Date.now();
    velocityRef.current = { x: 0, y: 0 };
    
    // Cancel any ongoing momentum animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !lastPosRef.current) return;
    
    const now = Date.now();
    const dt = Math.max(now - lastTimeRef.current, 1);
    
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    
    // Update position immediately for responsiveness
    positionRef.current = {
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy,
    };
    
    // Calculate velocity for momentum
    velocityRef.current = {
      x: (dx / dt) * 16, // Normalize to ~60fps
      y: (dy / dt) * 16,
    };
    
    setState(prev => ({
      ...prev,
      position: { ...positionRef.current },
    }));
    
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = now;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    setIsDragging(false);
    lastPosRef.current = null;
  }, []);

  // Wheel zoom with cursor position as anchor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    const currentScale = scaleRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * delta));
    
    // Calculate zoom centered on mouse position
    const scaleRatio = newScale / currentScale;
    const newX = mouseX - (mouseX - positionRef.current.x) * scaleRatio;
    const newY = mouseY - (mouseY - positionRef.current.y) * scaleRatio;
    
    positionRef.current = { x: newX, y: newY };
    scaleRef.current = newScale;
    
    setState({
      position: { x: newX, y: newY },
      scale: newScale,
    });
  }, []);

  // Touch handlers for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2) {
      // Pinch start
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };
      
      touchesRef.current.set(touches[0].identifier, touch1);
      touchesRef.current.set(touches[1].identifier, touch2);
      
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      initialPinchDistanceRef.current = distance;
      initialPinchScaleRef.current = scaleRef.current;
      
      // Calculate center point
      initialPinchCenterRef.current = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2,
      };
    } else if (touches.length === 1) {
      // Single touch - start pan
      const touch = touches[0];
      isDraggingRef.current = true;
      setIsDragging(true);
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastTimeRef.current = Date.now();
      velocityRef.current = { x: 0, y: 0 };
      
      touchesRef.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 2 && initialPinchDistanceRef.current && initialPinchCenterRef.current) {
      // Pinch zoom
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };
      
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      const scaleRatio = distance / initialPinchDistanceRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialPinchScaleRef.current * scaleRatio));
      
      // Calculate center
      const centerX = (touch1.x + touch2.x) / 2;
      const centerY = (touch1.y + touch2.y) / 2;
      
      // Zoom centered on pinch center
      const currentScale = scaleRef.current;
      const scaleChange = newScale / currentScale;
      
      positionRef.current = {
        x: centerX - (centerX - positionRef.current.x) * scaleChange,
        y: centerY - (centerY - positionRef.current.y) * scaleChange,
      };
      scaleRef.current = newScale;
      
      setState({
        position: { ...positionRef.current },
        scale: newScale,
      });
    } else if (touches.length === 1 && isDraggingRef.current && lastPosRef.current) {
      // Pan with single touch
      const touch = touches[0];
      const now = Date.now();
      const dt = Math.max(now - lastTimeRef.current, 1);
      
      const dx = touch.clientX - lastPosRef.current.x;
      const dy = touch.clientY - lastPosRef.current.y;
      
      positionRef.current = {
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy,
      };
      
      velocityRef.current = {
        x: (dx / dt) * 16,
        y: (dy / dt) * 16,
      };
      
      setState(prev => ({
        ...prev,
        position: { ...positionRef.current },
      }));
      
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastTimeRef.current = now;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    // Clean up ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      touchesRef.current.delete(e.changedTouches[i].identifier);
    }
    
    if (touches.length < 2) {
      initialPinchDistanceRef.current = null;
      initialPinchCenterRef.current = null;
    }
    
    if (touches.length === 0) {
      isDraggingRef.current = false;
      setIsDragging(false);
      lastPosRef.current = null;
    }
  }, []);

  const zoom = useCallback((newScale: number, center?: Point) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    
    if (center) {
      // Zoom centered on specific point
      const scaleRatio = clampedScale / scaleRef.current;
      positionRef.current = {
        x: center.x - (center.x - positionRef.current.x) * scaleRatio,
        y: center.y - (center.y - positionRef.current.y) * scaleRatio,
      };
    }
    
    scaleRef.current = clampedScale;
    setState(prev => ({
      ...prev,
      position: { ...positionRef.current },
      scale: clampedScale,
    }));
  }, []);

  const resetView = useCallback(() => {
    positionRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    velocityRef.current = { x: 0, y: 0 };
    setState({
      position: { x: 0, y: 0 },
      scale: 1,
    });
  }, []);

  const setPosition = useCallback((x: number, y: number) => {
    positionRef.current = { x, y };
    velocityRef.current = { x: 0, y: 0 };
    setState(prev => ({
      ...prev,
      position: { x, y },
    }));
  }, []);

  return {
    position: state.position,
    scale: state.scale,
    isDragging,
    isSpacePressed,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    zoom,
    resetView,
    setPosition,
  };
}
