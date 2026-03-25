"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { PositionedEvent } from "../types/feed.types";

interface FlyerBoardItemProps {
  event: PositionedEvent;
  index: number;
  onTap: (eventId: string) => void;
  onDoubleTap?: (eventId: string) => void;
}

const STAGGER_DELAY = 0.03;
const DOUBLE_TAP_THRESHOLD = 300;
const MAX_TILT_DEG = 8;
const TILT_INTENSITY = 0.15;

export function FlyerBoardItem({ event, index, onTap, onDoubleTap }: FlyerBoardItemProps) {
  const lastTapRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // 3D parallax motion values (desktop only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring for smooth tilt animation
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  // Transform mouse position to rotation degrees
  const rotateX = useTransform(springY, [-1, 1], [MAX_TILT_DEG, -MAX_TILT_DEG]);
  const rotateY = useTransform(springX, [-1, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]);

  // Handle mouse move for parallax (desktop only)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate normalized position (-1 to 1)
      const normalizedX = (e.clientX - centerX) / (rect.width / 2) * TILT_INTENSITY;
      const normalizedY = (e.clientY - centerY) / (rect.height / 2) * TILT_INTENSITY;

      mouseX.set(Math.max(-1, Math.min(1, normalizedX)));
      mouseY.set(Math.max(-1, Math.min(1, normalizedY)));
    },
    [isMobile, mouseX, mouseY]
  );

  // Reset tilt on mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  }, [mouseX, mouseY]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
      // Double-tap: heat/calor action
      onDoubleTap?.(event.id);
      return;
    }

    // Single tap: expand flyer
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= DOUBLE_TAP_THRESHOLD) {
        onTap(event.id);
      }
    }, DOUBLE_TAP_THRESHOLD);
  }, [event.id, onTap, onDoubleTap]);

  const baseScale = event.scale ?? 1;

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: event.x,
        top: event.y,
        rotate: event.rotation,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: baseScale, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * STAGGER_DELAY,
      }}
      onClick={handleTap}
    >
      <motion.div
        ref={cardRef}
        className="relative w-[140px] h-[200px] sm:w-[180px] sm:h-[260px] overflow-hidden rounded-lg"
        style={{
          perspective: 800,
          rotateX: isMobile ? 0 : rotateX,
          rotateY: isMobile ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        whileHover={!isMobile ? { scale: 1.05 } : {}}
        whileTap={{ scale: 0.98 }}
      >
        {/* Card container with border and shadow */}
        <div
          className="relative h-full w-full overflow-hidden rounded-lg border transition-all duration-300"
          style={{
            borderColor: isHovered && !isMobile
              ? "rgba(57, 255, 20, 0.3)"
              : "rgba(42, 42, 42, 0.5)",
            boxShadow: isHovered && !isMobile
              ? "0 0 30px rgba(57, 255, 20, 0.15), 0 10px 40px rgba(0, 0, 0, 0.5)"
              : "0 4px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Flyer image */}
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 140px, 180px"
            priority={index < 6}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-8">
            <p className="truncate text-xs font-medium text-white/95 font-[family-name:var(--font-space-mono)]">
              {event.title}
            </p>
            {event.date && (
              <p className="truncate text-[10px] text-white/60 mt-0.5">
                {new Date(event.date).toLocaleDateString("es-MX", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Heat count badge */}
          {event.heat_count != null && event.heat_count > 0 && (
            <motion.div
              className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(255, 107, 43, 0.9)",
                fontFamily: "'Space Mono', monospace",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * STAGGER_DELAY + 0.2 }}
            >
              <span>🔥</span>
              <span>{event.heat_count}</span>
            </motion.div>
          )}

          {/* Focus ring (keyboard navigation) */}
          <div className="absolute inset-0 rounded-lg ring-2 ring-neon-green opacity-0 transition-opacity focus-within:opacity-100" />
        </div>
      </motion.div>
    </motion.div>
  );
}
