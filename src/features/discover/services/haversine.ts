/** Mean Earth radius in kilometers (WGS-84 approximation). */
const EARTH_RADIUS_KM = 6371;

/** Degrees → radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lng points, in kilometers (Haversine).
 *
 * Used by discovery to keep only scraped events whose real coordinates fall
 * within an attendable radius of the user. Pure and side-effect free.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
