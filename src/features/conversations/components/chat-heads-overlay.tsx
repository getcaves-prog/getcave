"use client";

import { useRef, useCallback, useReducer } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EventThread } from "./event-thread";
import { useOpenChatsStore } from "../stores/open-chats.store";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { OpenChat } from "../stores/open-chats.store";

// ─── Spring config ─────────────────────────────────────────────────────────

const SPRING = { type: "spring", stiffness: 340, damping: 30 } as const;
const SPRING_FAST = { type: "spring", stiffness: 500, damping: 35 } as const;

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Mobile detection hook ─────────────────────────────────────────────────
// Uses CSS media query so it's SSR-safe (no window.innerWidth on first render)

function useIsMobile(): boolean {
  // We track this with a simple state initialized via window.matchMedia
  // The overlay is "use client" so this runs only client-side
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

// ─── Chat Window (expanded, desktop) ─────────────────────────────────────

interface ChatWindowProps {
  chat: OpenChat;
  currentUserId: string | undefined;
  index: number; // for horizontal stacking
  isMobile: boolean;
  prefersReduced: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onFocus: () => void;
}

function ChatWindow({
  chat,
  currentUserId,
  index,
  isMobile,
  prefersReduced,
  onMinimize,
  onClose,
  onFocus,
}: ChatWindowProps) {
  // Desktop: stack windows side by side from the right (24px gap, 360px width)
  // Mobile: single near-fullscreen panel
  const windowStyle = isMobile
    ? {
        position: "fixed" as const,
        inset: "0 0 0 0",
        zIndex: chat.zIndex,
      }
    : {
        position: "fixed" as const,
        bottom: 16,
        right: 16 + index * (360 + 12),
        width: 360,
        height: 520,
        zIndex: chat.zIndex,
      };

  return (
    <motion.div
      key={chat.id + "-window"}
      layoutId={prefersReduced ? undefined : `chat-${chat.id}`}
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
      transition={prefersReduced ? { duration: 0.15 } : SPRING}
      style={windowStyle}
      className={`flex flex-col overflow-hidden shadow-2xl border border-white/10 bg-[#070707] ${
        isMobile ? "" : "rounded-xl"
      }`}
      onPointerDown={onFocus}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-[#0A0A0A] flex-shrink-0">
        {/* Icon */}
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white/70">
            <IconChat />
          </span>
        </div>

        {/* Label */}
        <p className="flex-1 min-w-0 text-[12px] font-[family-name:var(--font-space-mono)] text-white truncate">
          {chat.label}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Minimizar"
          >
            <IconMinus />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <IconX />
          </button>
        </div>
      </div>

      {/* ── Thread ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {/*
          EventThread renders its own scrollable area (max-h-80 inside the component).
          We override that constraint by wrapping with a flex container that lets
          it grow. The outer container clips overflow.
        */}
        <div className="h-full overflow-y-auto [&_.max-h-80]:max-h-none [&_.max-h-80]:h-full">
          <EventThread
            subjectType={chat.subjectType}
            subjectId={chat.subjectId}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Draggable Bubble (minimized) ─────────────────────────────────────────

interface ChatBubbleProps {
  chat: OpenChat;
  bubbleIndex: number; // stacking position for mobile corner
  isMobile: boolean;
  prefersReduced: boolean;
  onExpand: () => void;
  onClose: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

function ChatBubble({
  chat,
  bubbleIndex,
  isMobile,
  prefersReduced,
  onExpand,
  onClose,
  onDragEnd,
}: ChatBubbleProps) {
  const dragRef = useRef<HTMLDivElement>(null);

  // Default bubble position: bottom-right corner, stacked upward on mobile
  const defaultX = chat.position?.x ?? 0;
  const defaultY = chat.position?.y ?? 0;

  // Mobile: stack bubbles in the bottom-right corner (56px bubble + 8px gap)
  const mobileBottomOffset = 80 + bubbleIndex * 72; // above bottom nav

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
      onDragEnd({ x: info.point.x, y: info.point.y });
    },
    [onDragEnd]
  );

  const labelInitials = chat.label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.div
      ref={dragRef}
      key={chat.id + "-bubble"}
      layoutId={prefersReduced ? undefined : `chat-${chat.id}`}
      drag={!isMobile}
      dragMomentum={false}
      dragConstraints={
        typeof window !== "undefined"
          ? { left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }
          : undefined
      }
      onDragEnd={handleDragEnd}
      initial={prefersReduced ? { opacity: 0, scale: 0.8 } : { opacity: 0, scale: 0 }}
      animate={prefersReduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      exit={prefersReduced ? { opacity: 0, scale: 0.8 } : { opacity: 0, scale: 0 }}
      transition={prefersReduced ? { duration: 0.15 } : SPRING_FAST}
      style={
        isMobile
          ? {
              position: "fixed",
              bottom: mobileBottomOffset,
              right: 16,
              zIndex: chat.zIndex,
            }
          : {
              position: "fixed",
              bottom: 16,
              right: 16,
              x: defaultX,
              y: defaultY,
              zIndex: chat.zIndex,
            }
      }
      className="group relative touch-none"
      aria-label={`Chat: ${chat.label}`}
    >
      {/* Main bubble button */}
      <button
        type="button"
        onClick={onExpand}
        className="w-14 h-14 rounded-full bg-[#0A0A0A] border-2 border-white/20 hover:border-white/60 flex items-center justify-center shadow-xl transition-colors relative overflow-hidden"
        aria-label={`Abrir chat: ${chat.label}`}
      >
        {/* Punk texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <span className="relative text-[13px] font-bold text-white font-[family-name:var(--font-space-mono)] tracking-wider">
          {labelInitials || <IconChat />}
        </span>
      </button>

      {/* Close affordance — appears on hover */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        whileHover={{ opacity: 1, scale: 1 }}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF2D7B] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        aria-label="Cerrar chat"
      >
        <IconX size={8} />
      </motion.button>

      {/* Label tooltip below (desktop only) */}
      {!isMobile && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-[#0A0A0A] border border-white/10 text-[10px] text-white font-[family-name:var(--font-space-mono)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none max-w-[160px] truncate">
          {chat.label}
        </div>
      )}
    </motion.div>
  );
}

// ─── ChatHeadsOverlay — public component ──────────────────────────────────

export function ChatHeadsOverlay() {
  const chats = useOpenChatsStore((s) => s.chats);
  const closeChat = useOpenChatsStore((s) => s.closeChat);
  const minimizeChat = useOpenChatsStore((s) => s.minimizeChat);
  const expandChat = useOpenChatsStore((s) => s.expandChat);
  const focusChat = useOpenChatsStore((s) => s.focusChat);
  const setPosition = useOpenChatsStore((s) => s.setPosition);

  const { user } = useAuth();
  const prefersReduced = useReducedMotion() ?? false;

  // Force a re-render on client mount so isMobile is correct
  // (avoids SSR hydration mismatch — overlay is client-only)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const isMobileRef = useRef<boolean | null>(null);
  if (typeof window !== "undefined" && isMobileRef.current === null) {
    isMobileRef.current = window.matchMedia("(max-width: 767px)").matches;
  }
  const isMobile = isMobileRef.current ?? false;

  // Nothing to render if no chats
  if (chats.length === 0) return null;

  // Separate expanded vs minimized chats
  const expandedChats = chats
    .filter((c) => !c.minimized)
    .sort((a, b) => a.zIndex - b.zIndex);

  const minimizedChats = chats
    .filter((c) => c.minimized)
    .sort((a, b) => a.zIndex - b.zIndex);

  // On mobile with a single fullscreen window, don't show other expanded windows
  const visibleExpanded = isMobile ? expandedChats.slice(-1) : expandedChats;

  return (
    <>
      {/* ── Expanded windows ─────────────────────────────────────────── */}
      <AnimatePresence>
        {visibleExpanded.map((chat, index) => (
          <ChatWindow
            key={chat.id}
            chat={chat}
            currentUserId={user?.id}
            index={index}
            isMobile={isMobile}
            prefersReduced={prefersReduced}
            onMinimize={() => minimizeChat(chat.id)}
            onClose={() => closeChat(chat.id)}
            onFocus={() => focusChat(chat.id)}
          />
        ))}
      </AnimatePresence>

      {/* ── Minimized bubbles ─────────────────────────────────────────── */}
      <AnimatePresence>
        {minimizedChats.map((chat, bubbleIndex) => (
          <ChatBubble
            key={chat.id}
            chat={chat}
            bubbleIndex={bubbleIndex}
            isMobile={isMobile}
            prefersReduced={prefersReduced}
            onExpand={() => expandChat(chat.id)}
            onClose={() => closeChat(chat.id)}
            onDragEnd={(pos) => setPosition(chat.id, pos)}
          />
        ))}
      </AnimatePresence>

      {/* Mobile backdrop — tap outside to minimize */}
      <AnimatePresence>
        {isMobile && visibleExpanded.length > 0 && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: visibleExpanded[visibleExpanded.length - 1].zIndex - 1 }}
            onClick={() => {
              // Minimize all expanded on mobile when tapping backdrop
              visibleExpanded.forEach((c) => minimizeChat(c.id));
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
