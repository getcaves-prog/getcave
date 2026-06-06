import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SubjectType } from "../types/conversation.types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OpenChat {
  /** Stable key: "{subjectType}:{subjectId}" */
  id: string;
  subjectType: SubjectType;
  subjectId: string;
  label: string;
  minimized: boolean;
  /** Persisted dragged position for the bubble (minimized state) */
  position?: { x: number; y: number };
  /** Stack order — higher = on top (only relevant for desktop multi-window) */
  zIndex: number;
}

interface OpenChatsState {
  chats: OpenChat[];
  /** The id of the currently focused window (for z-order) */
  focusedId: string | null;
  /** Running counter to assign ascending z-indexes */
  _zCounter: number;
}

interface OpenChatsActions {
  /**
   * Open or un-minimize a chat. If the chat is already open, bring it to
   * the front. If already open AND minimized, expand it. Caps at 3 windows
   * on desktop (further opens replace the LRU, i.e. the lowest zIndex).
   */
  openChat: (chat: Pick<OpenChat, "subjectType" | "subjectId" | "label">) => void;
  closeChat: (id: string) => void;
  minimizeChat: (id: string) => void;
  expandChat: (id: string) => void;
  setPosition: (id: string, position: { x: number; y: number }) => void;
  focusChat: (id: string) => void;
}

export type OpenChatsStore = OpenChatsState & OpenChatsActions;

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_DESKTOP_WINDOWS = 3;
const BASE_Z = 150;

function makeChatId(subjectType: SubjectType, subjectId: string): string {
  return `${subjectType}:${subjectId}`;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useOpenChatsStore = create<OpenChatsStore>()(
  persist(
    (set, get) => ({
      chats: [],
      focusedId: null,
      _zCounter: 0,

      openChat({ subjectType, subjectId, label }) {
        const id = makeChatId(subjectType, subjectId);
        const { chats, _zCounter } = get();
        const existing = chats.find((c) => c.id === id);

        if (existing) {
          // Already open: un-minimize + bring to front
          set({
            chats: chats.map((c) =>
              c.id === id
                ? { ...c, minimized: false, zIndex: BASE_Z + _zCounter + 1 }
                : c
            ),
            focusedId: id,
            _zCounter: _zCounter + 1,
          });
          return;
        }

        // New chat — enforce desktop cap
        let updatedChats = [...chats];
        if (updatedChats.length >= MAX_DESKTOP_WINDOWS) {
          // Remove the LRU (lowest zIndex) to make room
          const lru = [...updatedChats].sort((a, b) => a.zIndex - b.zIndex)[0];
          updatedChats = updatedChats.filter((c) => c.id !== lru.id);
        }

        const newChat: OpenChat = {
          id,
          subjectType,
          subjectId,
          label,
          minimized: false,
          zIndex: BASE_Z + _zCounter + 1,
        };

        set({
          chats: [...updatedChats, newChat],
          focusedId: id,
          _zCounter: _zCounter + 1,
        });
      },

      closeChat(id) {
        const { chats, focusedId } = get();
        const remaining = chats.filter((c) => c.id !== id);
        set({
          chats: remaining,
          focusedId: focusedId === id ? (remaining[remaining.length - 1]?.id ?? null) : focusedId,
        });
      },

      minimizeChat(id) {
        set((s) => ({
          chats: s.chats.map((c) => (c.id === id ? { ...c, minimized: true } : c)),
          focusedId: s.focusedId === id ? null : s.focusedId,
        }));
      },

      expandChat(id) {
        const { chats, _zCounter } = get();
        set({
          chats: chats.map((c) =>
            c.id === id
              ? { ...c, minimized: false, zIndex: BASE_Z + _zCounter + 1 }
              : c
          ),
          focusedId: id,
          _zCounter: _zCounter + 1,
        });
      },

      setPosition(id, position) {
        set((s) => ({
          chats: s.chats.map((c) => (c.id === id ? { ...c, position } : c)),
        }));
      },

      focusChat(id) {
        const { _zCounter, chats } = get();
        set({
          chats: chats.map((c) =>
            c.id === id ? { ...c, zIndex: BASE_Z + _zCounter + 1 } : c
          ),
          focusedId: id,
          _zCounter: _zCounter + 1,
        });
      },
    }),
    {
      name: "caves-open-chats",
      storage: createJSONStorage(() => {
        // SSR-safe: return a no-op storage when window is not available
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Only persist the chat list + minimized state; skip transient focus/z-counter
      partialize: (state) => ({
        chats: state.chats.map((c) => ({
          ...c,
          // Reset to minimized on reload so windows don't block content on load
          minimized: true,
        })),
        _zCounter: state._zCounter,
      }),
    }
  )
);
