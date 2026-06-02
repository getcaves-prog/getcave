interface IpLocationResult {
  lat: number;
  lng: number;
  city: string;
  region: string;
  country: string;
}

/**
 * Resolves the user's approximate location via IP geolocation.
 * No permission prompt required — works instantly.
 *
 * Strategy:
 * 1. Primary: ipapi.co (HTTPS, 1000 req/day free)
 * 2. Fallback: ip-api.com (HTTP only — free tier doesn't support HTTPS)
 *
 * ip-api.com is only used as a fallback because it requires HTTP,
 * which causes mixed-content issues in production HTTPS sites.
 */
export async function getLocationByIp(): Promise<IpLocationResult | null> {
  // Primary: ipapi.co (HTTPS supported on free tier)
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || "",
          region: data.region || "",
          country: data.country_name || "",
        };
      }
    }
  } catch {
    // Silent fail — try fallback
  }

  // Fallback: ip-api.com (HTTP only on free tier — dev environments only)
  if (typeof window !== "undefined" && window.location.protocol === "http:") {
    try {
      const res = await fetch(
        "http://ip-api.com/json/?fields=lat,lon,city,regionName,country",
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lon) {
          return {
            lat: data.lat,
            lng: data.lon,
            city: data.city || "",
            region: data.regionName || "",
            country: data.country || "",
          };
        }
      }
    } catch {
      // Silent fail
    }
  }

  return null;
}
