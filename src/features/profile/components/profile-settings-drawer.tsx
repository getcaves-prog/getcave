"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MyConversationsList } from "@/features/profile/components/my-conversations-list";
import { ActivityFeed } from "@/features/profile/components/activity-feed";
import { ForYouEditor } from "@/features/profile/components/for-you-editor";
import { COMMUNITIES_ENABLED } from "@/shared/config/features";
import type {
  MyConversation,
  ActivityItem,
} from "@/features/profile/types/activity.types";

type Panel = "menu" | "conversations" | "activity" | "for-you";

interface ProfileSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  conversations: MyConversation[];
  recentActivity: ActivityItem[];
  activityLoading: boolean;
  /** Opens the profile edit modal. */
  onEditProfile: () => void;
  onSignOut: () => void;
}

// ─── Profile settings drawer ─────────────────────────────────────────────────
// Bottom-sheet that consolidates secondary profile actions that the redesigned
// page no longer surfaces as tabs: edit profile, Mis chats, Actividad, Editar
// intereses (For You), Admin, and Cerrar sesión. Each sub-panel reuses the
// existing components — nothing was deleted, only relocated.
export function ProfileSettingsDrawer({
  open,
  onClose,
  isAdmin,
  conversations,
  recentActivity,
  activityLoading,
  onEditProfile,
  onSignOut,
}: ProfileSettingsDrawerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [panel, setPanel] = useState<Panel>("menu");

  const close = () => {
    setPanel("menu");
    onClose();
  };

  const titles: Record<Panel, string> = {
    menu: "Ajustes",
    conversations: "Mis chats",
    activity: "Actividad",
    "for-you": "Editar intereses",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 bg-cave-black/80 backdrop-blur-sm"
          />

          <motion.div
            className="relative z-10 w-full sm:max-w-[480px] max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-cave-ash/60 bg-cave-stone p-5 safe-area-bottom"
            initial={
              prefersReducedMotion ? false : { y: "100%", opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {panel !== "menu" && (
                  <button
                    type="button"
                    onClick={() => setPanel("menu")}
                    className="flex items-center justify-center w-8 h-8 -ml-1 text-cave-fog hover:text-cave-white transition-colors"
                    aria-label="Volver"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}
                <h2 className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] font-bold uppercase tracking-[0.1em]">
                  {titles[panel]}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex items-center justify-center w-8 h-8 text-cave-fog hover:text-cave-white transition-colors"
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Menu panel */}
            {panel === "menu" && (
              <div className="flex flex-col gap-1.5">
                <MenuButton
                  label="Editar perfil"
                  onClick={() => {
                    close();
                    onEditProfile();
                  }}
                />
                <MenuButton
                  label="Mis chats"
                  onClick={() => setPanel("conversations")}
                />
                <MenuButton
                  label="Actividad"
                  onClick={() => setPanel("activity")}
                />
                <MenuButton
                  label="Editar intereses (For You)"
                  onClick={() => setPanel("for-you")}
                />
                {COMMUNITIES_ENABLED && (
                  <Link
                    href="/communities"
                    onClick={close}
                    className="flex items-center justify-between rounded-xl border border-cave-ash/50 bg-cave-dark px-4 py-3.5 text-sm text-cave-light font-[family-name:var(--font-space-mono)] transition-colors hover:border-cave-smoke hover:text-cave-white"
                  >
                    Explorar comunidades
                    <span className="text-cave-smoke">→</span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="flex items-center justify-between rounded-xl border border-cave-ash/50 bg-cave-dark px-4 py-3.5 text-sm text-cave-light font-[family-name:var(--font-space-mono)] transition-colors hover:border-cave-smoke hover:text-cave-white"
                  >
                    Admin
                    <span className="text-cave-smoke">→</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onSignOut();
                  }}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-cave-ash/50 bg-cave-dark px-4 py-3.5 text-sm text-cave-fog font-[family-name:var(--font-space-mono)] transition-colors hover:text-cave-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}

            {panel === "conversations" && (
              <MyConversationsList
                conversations={conversations}
                loading={activityLoading}
              />
            )}
            {panel === "activity" && (
              <ActivityFeed items={recentActivity} loading={activityLoading} />
            )}
            {panel === "for-you" && <ForYouEditor />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-xl border border-cave-ash/50 bg-cave-dark px-4 py-3.5 text-sm text-cave-light font-[family-name:var(--font-space-mono)] transition-colors hover:border-cave-smoke hover:text-cave-white"
    >
      {label}
      <span className="text-cave-smoke">→</span>
    </button>
  );
}
