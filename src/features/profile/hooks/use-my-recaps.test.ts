import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ─── Mock listMyRecaps ─────────────────────────────────────────────────────
const mockListMyRecaps = vi.fn();

vi.mock("@/features/recaps/services/recaps.service", () => ({
  listMyRecaps: (...args: unknown[]) => mockListMyRecaps(...args),
}));

import { useMyRecaps } from "./use-my-recaps";
import type { MyRecap } from "@/features/recaps/types/recaps.types";

const MOCK_RECAPS: MyRecap[] = [
  {
    id: "m1",
    media_url: "https://cdn.example.com/recaps/img1.jpg",
    thumbnail_url: null,
    media_type: "image",
    flyer_id: "flyer-1",
    flyer_title: "Cave Night",
    event_date: "2026-06-07",
    community_name: "Techno Cave",
  },
  {
    id: "m2",
    media_url: "https://cdn.example.com/recaps/vid2.mp4",
    thumbnail_url: null,
    media_type: "video",
    flyer_id: "flyer-2",
    flyer_title: "Dark Rave",
    event_date: "2026-06-06",
    community_name: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMyRecaps", () => {
  it("starts in idle state (loading false, empty recaps) when userId is undefined", () => {
    const { result } = renderHook(() => useMyRecaps(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.recaps).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("does not call listMyRecaps when userId is undefined", () => {
    renderHook(() => useMyRecaps(undefined));

    expect(mockListMyRecaps).not.toHaveBeenCalled();
  });

  it("calls listMyRecaps with the userId and transitions to loaded state", async () => {
    mockListMyRecaps.mockResolvedValue(MOCK_RECAPS);

    const { result } = renderHook(() => useMyRecaps("user-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListMyRecaps).toHaveBeenCalledWith("user-1");
    expect(result.current.recaps).toEqual(MOCK_RECAPS);
    expect(result.current.error).toBeNull();
  });

  it("sets error when listMyRecaps rejects", async () => {
    mockListMyRecaps.mockRejectedValue(new Error("RLS denied"));

    const { result } = renderHook(() => useMyRecaps("user-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("RLS denied");
    expect(result.current.recaps).toEqual([]);
  });

  it("returns empty recaps array when listMyRecaps returns []", async () => {
    mockListMyRecaps.mockResolvedValue([]);

    const { result } = renderHook(() => useMyRecaps("user-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recaps).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
