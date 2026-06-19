import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(url: string | null): Request {
  const target =
    url === null
      ? "http://localhost/api/img"
      : `http://localhost/api/img?url=${encodeURIComponent(url)}`;
  return new Request(target);
}

describe("GET /api/img", () => {
  it("returns 400 when url param is missing", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-allowlisted host (SSRF guard)", async () => {
    const res = await GET(makeRequest("https://evil.com/a.jpg"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-http(s) protocol", async () => {
    const res = await GET(makeRequest("file:///etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("proxies an allowlisted image with content-type and cache-control", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );

    const res = await GET(
      makeRequest("https://scontent.fbcdn.net/a.jpg")
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
  });

  it("returns 404 when the upstream fetch is not ok", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

    const res = await GET(
      makeRequest("https://scontent.fbcdn.net/a.jpg")
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const res = await GET(
      makeRequest("https://cdninstagram.com/a.jpg")
    );
    expect(res.status).toBe(404);
  });
});
