"use client";

import { useEffect } from "react";

interface EventViewTrackerProps {
  eventId: string;
}

export function EventViewTracker({ eventId }: EventViewTrackerProps) {
  useEffect(() => {
    fetch(`/api/events/${eventId}/view`, { method: "POST" }).catch(() => {
      // Silently fail — view tracking is non-critical
    });
  }, [eventId]);

  return null;
}
