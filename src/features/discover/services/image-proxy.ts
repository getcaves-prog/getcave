/**
 * Allowlisted host suffixes for the image proxy. Only external CDNs that block
 * hotlinking / expire their URLs (FB, IG, LinkedIn) are permitted — anything
 * else is rejected to prevent the proxy from becoming an open SSRF relay.
 */
export const ALLOWED_IMAGE_HOST_SUFFIXES = [
  "fbcdn.net",
  "cdninstagram.com",
  "instagram.com",
  "fbsbx.com",
  "licdn.com",
  // Ticketmaster Discovery API event images.
  "ticketm.net",
  "ticketmaster.com",
] as const;

/**
 * True when `url` is a valid http(s) URL whose hostname equals or ends with a
 * `.`-delimited allowlisted suffix (so `evil.com` masquerading as
 * `fbcdn.net.evil.com` is rejected).
 */
export function isAllowedImageHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  return ALLOWED_IMAGE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

/**
 * Wrap an external image URL so the client loads it through our proxy
 * (`/api/img`). Returns falsy input unchanged.
 */
export function proxiedImageUrl(url: string): string;
export function proxiedImageUrl(url: null): null;
export function proxiedImageUrl(url: string | null): string | null;
export function proxiedImageUrl(url: string | null): string | null {
  if (!url) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}
