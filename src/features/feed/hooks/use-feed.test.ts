import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFeed } from "./use-feed";
import type { FeedEvent } from "../types/feed.types";
import type { Coordinates } from "@/shared/lib/utils/geo";

vi.mock("../services/feed.service");

import { fetchNearbyEvents } from "../services/feed.service";

const mockFetchNearbyEvents = vi.mocked(fetchNearbyEvents);

const MOCK_COORDINATES: Coordinates = {
  latitude: 19.4326,
  longitude: -99.1332,
};

function createMockEvent(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    id: "event-1",
    title: "Test Event",
    description: "A test event",
    date: "2026-04-01",
    time_start: "20:00",
    time_end: "23:00",
    venue_name: "Test Venue",
    venue_address: "123 Test St",
    location: "POINT(-99.1332 19.4326)",
    flyer_url: "https://example.com/flyer.jpg",
    category_id: "cat-1",
    category_name: "Music",
    category_slug: "music",
    distance_meters: 500,
    price: 100,
    currency: "MXN",
    status: "active",
    external_url: null,
    user_id: "user-1",
    views_count: 0,
    heat_count: 0,
    expires_at: "2026-03-27T00:00:00Z",
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

describe("useFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return initial state when coordinates are null", () => {
    const { result } = renderHook(() => useFeed(null));

    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(true);
    expect(result.current.currentIndex).toBe(0);
  });

  it("should fetch events when coordinates are provided", async () => {
    const mockEvents = [createMockEvent(), createMockEvent({ id: "event-2" })];
    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: mockEvents,
      hasMore: true,
    });

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockFetchNearbyEvents).toHaveBeenCalledWith(
      {
        latitude: MOCK_COORDINATES.latitude,
        longitude: MOCK_COORDINATES.longitude,
        radiusMeters: 25000,
      },
      { limit: 20, offset: 0 },
      undefined
    );
  });

  it("should pass categorySlug to fetchNearbyEvents", async () => {
    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: [],
      hasMore: false,
    });

    renderHook(() => useFeed(MOCK_COORDINATES, "music"));

    await waitFor(() => {
      expect(mockFetchNearbyEvents).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        "music"
      );
    });
  });

  it("should handle fetch error", async () => {
    mockFetchNearbyEvents.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.events).toEqual([]);
  });

  it("should handle non-Error thrown values", async () => {
    mockFetchNearbyEvents.mockRejectedValueOnce("something weird");

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load events");
  });

  it("should load more events and append them", async () => {
    const firstBatch = [createMockEvent({ id: "event-1" })];
    const secondBatch = [createMockEvent({ id: "event-2" })];

    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: firstBatch,
      hasMore: true,
    });

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });

    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: secondBatch,
      hasMore: false,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.events[0].id).toBe("event-1");
    expect(result.current.events[1].id).toBe("event-2");
    expect(result.current.hasMore).toBe(false);
  });

  it("should not load more when hasMore is false", async () => {
    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: [createMockEvent()],
      hasMore: false,
    });

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    mockFetchNearbyEvents.mockClear();

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchNearbyEvents).not.toHaveBeenCalled();
  });

  it("should retry and reset events", async () => {
    mockFetchNearbyEvents.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.error).toBe("Fail");
    });

    const retryEvents = [createMockEvent({ id: "retry-1" })];
    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: retryEvents,
      hasMore: false,
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(retryEvents);
    });

    expect(result.current.error).toBeNull();
  });

  it("should update currentIndex via setCurrentIndex", async () => {
    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: [createMockEvent()],
      hasMore: false,
    });

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCurrentIndex(5);
    });

    expect(result.current.currentIndex).toBe(5);
  });

  it("should reset events when coordinates change", async () => {
    const firstCoords: Coordinates = { latitude: 19.0, longitude: -99.0 };
    const secondCoords: Coordinates = { latitude: 20.0, longitude: -100.0 };

    const firstEvents = [createMockEvent({ id: "first-1" })];
    const secondEvents = [createMockEvent({ id: "second-1" })];

    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: firstEvents,
      hasMore: true,
    });

    const { result, rerender } = renderHook(
      ({ coords }) => useFeed(coords),
      { initialProps: { coords: firstCoords } }
    );

    await waitFor(() => {
      expect(result.current.events).toEqual(firstEvents);
    });

    mockFetchNearbyEvents.mockResolvedValueOnce({
      events: secondEvents,
      hasMore: false,
    });

    rerender({ coords: secondCoords });

    await waitFor(() => {
      expect(result.current.events).toEqual(secondEvents);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("should show loading state while fetching", async () => {
    let resolvePromise: (value: { events: FeedEvent[]; hasMore: boolean }) => void;
    mockFetchNearbyEvents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result } = renderHook(() => useFeed(MOCK_COORDINATES));

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ events: [], hasMore: false });
    });

    expect(result.current.loading).toBe(false);
  });
});
