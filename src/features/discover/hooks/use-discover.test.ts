import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDiscover } from "./use-discover";

const mockSearchFlyers = vi.fn();
const mockSearchNearbyFlyers = vi.fn();
const mockDiscoverEvents = vi.fn();

vi.mock("@/features/search/services/search.service", () => ({
  searchFlyers: (...args: unknown[]) => mockSearchFlyers(...args),
  searchNearbyFlyers: (...args: unknown[]) => mockSearchNearbyFlyers(...args),
}));

vi.mock("../services/discover.client", () => ({
  discoverEvents: (...args: unknown[]) => mockDiscoverEvents(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchFlyers.mockResolvedValue([]);
  mockSearchNearbyFlyers.mockResolvedValue([]);
  mockDiscoverEvents.mockResolvedValue({ events: [], localized: true });
});

describe("useDiscover", () => {
  it("uses searchNearbyFlyers (not searchFlyers) when location is provided", async () => {
    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("techno", "Monterrey", {
        lat: 25.6,
        lng: -100.3,
      });
    });

    expect(mockSearchNearbyFlyers).toHaveBeenCalledWith(
      "techno",
      25.6,
      -100.3
    );
    expect(mockSearchFlyers).not.toHaveBeenCalled();
  });

  it("falls back to searchFlyers (global) when no location is provided", async () => {
    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("techno", "Monterrey");
    });

    expect(mockSearchFlyers).toHaveBeenCalledWith("techno");
    expect(mockSearchNearbyFlyers).not.toHaveBeenCalled();
  });

  it("passes the city AND the user coords to the scraped discoverEvents pass", async () => {
    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("techno", "Monterrey", {
        lat: 25.6,
        lng: -100.3,
      });
    });

    expect(mockDiscoverEvents).toHaveBeenCalledWith("techno", "Monterrey", {
      lat: 25.6,
      lng: -100.3,
    });
  });

  it("passes undefined coords to discoverEvents when no location is known", async () => {
    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("techno", "Monterrey");
    });

    expect(mockDiscoverEvents).toHaveBeenCalledWith(
      "techno",
      "Monterrey",
      undefined
    );
  });

  it("shows DB nearby results then merges scraped events (two-pass)", async () => {
    mockSearchNearbyFlyers.mockResolvedValue([
      { id: "db-1", title: "Local Techno", event_date: "2026-07-01" },
    ]);
    mockDiscoverEvents.mockResolvedValue({
      events: [{ id: "scraped-1", title: "Scraped Rave", event_date: "2026-07-02" }],
      localized: true,
    });

    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("techno", "Monterrey", {
        lat: 25.6,
        lng: -100.3,
      });
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
    });
    expect(result.current.results.map((r) => r.id)).toContain("db-1");
    expect(result.current.results.map((r) => r.id)).toContain("scraped-1");
  });

  it("defaults localized to true before any search", () => {
    const { result } = renderHook(() => useDiscover());
    expect(result.current.localized).toBe(true);
  });

  it("sets localized:false when the scraped pass falls back to non-local events", async () => {
    mockDiscoverEvents.mockResolvedValue({
      events: [{ id: "scraped-1", title: "Far Rave", event_date: "2026-07-02" }],
      localized: false,
    });

    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("anime", "Cúcuta", { lat: 7.8, lng: -72.5 });
    });

    await waitFor(() => {
      expect(result.current.localized).toBe(false);
    });
  });

  it("resets localized to true on a new search", async () => {
    mockDiscoverEvents.mockResolvedValue({
      events: [{ id: "scraped-1", title: "Far Rave", event_date: "2026-07-02" }],
      localized: false,
    });

    const { result } = renderHook(() => useDiscover());

    await act(async () => {
      await result.current.search("anime", "Cúcuta", { lat: 7.8, lng: -72.5 });
    });
    await waitFor(() => expect(result.current.localized).toBe(false));

    mockDiscoverEvents.mockResolvedValue({ events: [], localized: true });
    await act(async () => {
      await result.current.search("techno", "Monterrey", {
        lat: 25.6,
        lng: -100.3,
      });
    });
    await waitFor(() => expect(result.current.localized).toBe(true));
  });
});
