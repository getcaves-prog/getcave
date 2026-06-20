import { getUserFlyers } from "@/features/profile/services/profile.service";
import { getFlyerViewCount } from "@/features/canvas/services/views.service";
import { getAttendance } from "@/features/canvas/services/attendance.service";
import { getFlyerSaveCount } from "@/features/canvas/services/favorites.service";
import type {
  CreatorAnalytics,
  FlyerAnalytics,
} from "@/features/analytics/types/analytics.types";

// Hard cap on how many flyers we aggregate metrics for, to bound the number
// of parallel round-trips for very prolific creators.
const MAX_FLYERS = 100;

// Resolve a possibly-failing metric promise to a safe numeric fallback.
// A single failing metric must never bring down the whole dashboard.
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

// ─── getCreatorAnalytics ────────────────────────────────────────────────────
// Aggregates the metrics of every flyer a user has published.
//
// Strategy:
//   1. Fetch the user's approved flyers (capped at MAX_FLYERS).
//   2. For each flyer, fetch views / attendance / saves IN PARALLEL.
//      The per-flyer fetches themselves run in parallel across flyers.
//   3. Sum into headline totals and sort the per-flyer list by views desc.
//
// Resilience: every metric is wrapped so a single failure degrades to 0
// instead of throwing the entire aggregation.
export async function getCreatorAnalytics(
  userId: string
): Promise<CreatorAnalytics> {
  const flyers = (await getUserFlyers(userId)).slice(0, MAX_FLYERS);

  if (flyers.length === 0) {
    return {
      totals: { flyers: 0, views: 0, attendees: 0, saves: 0 },
      flyers: [],
    };
  }

  const perFlyer: FlyerAnalytics[] = await Promise.all(
    flyers.map(async (flyer): Promise<FlyerAnalytics> => {
      const [views, attendance, saves] = await Promise.all([
        safe(getFlyerViewCount(flyer.id), 0),
        safe(getAttendance(flyer.id), {
          counts: { total: 0, solo: 0 },
          mine: { going: false, goingSolo: false },
        }),
        safe(getFlyerSaveCount(flyer.id), 0),
      ]);

      return {
        id: flyer.id,
        title: flyer.title,
        image_url: flyer.image_url,
        event_date: flyer.event_date,
        views,
        attendees: attendance.counts.total,
        soloAttendees: attendance.counts.solo,
        saves,
      };
    })
  );

  const totals = perFlyer.reduce(
    (acc, f) => {
      acc.views += f.views;
      acc.attendees += f.attendees;
      acc.saves += f.saves;
      return acc;
    },
    { flyers: perFlyer.length, views: 0, attendees: 0, saves: 0 }
  );

  perFlyer.sort((a, b) => b.views - a.views);

  return { totals, flyers: perFlyer };
}
