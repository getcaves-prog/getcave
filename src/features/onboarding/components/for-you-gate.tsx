"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  getOnboardingState,
} from "@/features/onboarding/services/preferences.service";
import { ForYouOnboarding } from "@/features/onboarding/components/for-you-onboarding";

/**
 * ForYouGate — shows the For You onboarding flow ONCE per authenticated user.
 *
 * Decision logic:
 *   1. No user (logged out) → render nothing.
 *   2. User present → call getOnboardingState() to check profiles.onboarding_completed_at.
 *   3. If NOT completed → render ForYouOnboarding as a full-screen overlay.
 *   4. On complete (or skip-all) → hide permanently for this session;
 *      the DB record ensures it won't reappear on refresh.
 *
 * Designed to be mounted at the home page so it overlays InfiniteCanvas on
 * first run. Non-blocking: logged-out users see nothing and the canvas is
 * unaffected.
 */
export function ForYouGate() {
  const { user, loading: authLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return;
    // No user → nothing to show
    if (!user) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    async function checkOnboarding() {
      try {
        const state = await getOnboardingState(user!.id);
        if (!cancelled) {
          setShow(!state.completed);
          setChecked(true);
        }
      } catch {
        // If the check fails (network, etc.) just skip silently
        if (!cancelled) {
          setChecked(true);
        }
      }
    }

    void checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Nothing to render until we know the state
  if (!checked || !show) return null;

  return (
    <AnimatePresence>
      <ForYouOnboarding onComplete={() => setShow(false)} prefill={false} />
    </AnimatePresence>
  );
}
