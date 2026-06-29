import { describe, it, expect } from "vitest";
import { proxiedImageUrl, isAllowedImageHost } from "./image-proxy";

describe("proxiedImageUrl", () => {
  it("wraps an external url through the /api/img proxy", () => {
    const url = "https://scontent.fbcdn.net/a.jpg";
    expect(proxiedImageUrl(url)).toBe(
      `/api/img?url=${encodeURIComponent(url)}`
    );
  });

  it("returns null/empty input unchanged", () => {
    expect(proxiedImageUrl("")).toBe("");
    expect(proxiedImageUrl(null)).toBeNull();
  });
});

describe("isAllowedImageHost", () => {
  it("allows fbcdn, cdninstagram, instagram, fbsbx, licdn, ticketmaster hosts", () => {
    expect(isAllowedImageHost("https://scontent.fbcdn.net/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://x.cdninstagram.com/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://www.instagram.com/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://y.fbsbx.com/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://media.licdn.com/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://s1.ticketm.net/dam/a.jpg")).toBe(true);
    expect(isAllowedImageHost("https://www.ticketmaster.com/a.jpg")).toBe(true);
  });

  it("rejects non-allowlisted hosts", () => {
    expect(isAllowedImageHost("https://evil.com/a.jpg")).toBe(false);
    expect(isAllowedImageHost("https://fbcdn.net.evil.com/a.jpg")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isAllowedImageHost("ftp://scontent.fbcdn.net/a.jpg")).toBe(false);
    expect(isAllowedImageHost("file:///etc/passwd")).toBe(false);
  });

  it("rejects malformed urls", () => {
    expect(isAllowedImageHost("not a url")).toBe(false);
    expect(isAllowedImageHost("")).toBe(false);
  });
});
