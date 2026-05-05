import { useMemo } from "react";
import type { NearbyFlyer } from "../types/canvas.types";

/**
 * Returns up to 3 flyers that share the same event_date as the current flyer,
 * excluding the current flyer, sorted by distance_m ascending.
 *
 * Returns [] when:
 * - currentEventDate is null
 * - fewer than 2 sibling flyers exist (section only shows when 2+ results)
 */
export function useMasHoy(
  currentFlyerId: string,
  allFlyers: NearbyFlyer[],
  currentEventDate: string | null
): NearbyFlyer[] {
  return useMemo(() => {
    if (!currentEventDate) return [];

    const siblings = allFlyers
      .filter((f) => f.id !== currentFlyerId && f.event_date === currentEventDate)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 3);

    if (siblings.length < 2) return [];

    return siblings;
  }, [currentFlyerId, allFlyers, currentEventDate]);
}
