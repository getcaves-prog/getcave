import { isAllowedImageHost } from "@/features/discover/services/image-proxy";

// Streams remote image bytes — Node runtime, not edge.
export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=86400";
const PROXY_TIMEOUT_MS = 15_000;

/**
 * Proxy an external image (FB/IG/LinkedIn CDN URLs that block hotlinking or
 * expire). The `url` host MUST be on the allowlist — otherwise 400, so this
 * can't be abused as an open proxy / SSRF relay. Upstream failures -> 404.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !isAllowedImageHost(url)) {
    return new Response("Bad request", { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, { signal: controller.signal });

    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: 404 });
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  } finally {
    clearTimeout(timer);
  }
}
