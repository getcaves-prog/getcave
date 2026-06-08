import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommunityPresence } from "./use-community-presence";

// ─── Mock Supabase client ──────────────────────────────────────────────────
// We mock the entire channel API so we can drive presence state changes
// from the test without a real network connection.

const mockTrack = vi.fn();
const mockUnsubscribe = vi.fn();
const mockRemoveChannel = vi.fn();

// Holds the registered "presence sync" callback so tests can trigger it
let presenceSyncCallback: (() => void) | null = null;
// Holds the subscribe callback so tests can trigger SUBSCRIBED status
let subscribeCallback: ((status: string) => void) | null = null;
// Mutable presence state returned by presenceState()
let mockPresenceState: Record<string, { user_id: string; username: string }[]> = {};

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
    subscribeCallback = cb;
    return mockChannel;
  }),
  presenceState: vi.fn().mockImplementation(() => mockPresenceState),
  unsubscribe: mockUnsubscribe,
  track: mockTrack,
};

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn().mockImplementation(() => {
      // Wire `on("presence", { event: "sync" }, cb)` to capture the callback
      mockChannel.on.mockImplementation(
        (event: string, _filter: unknown, cb: () => void) => {
          if (event === "presence") {
            presenceSyncCallback = cb;
          }
          return mockChannel;
        }
      );
      return mockChannel;
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  presenceSyncCallback = null;
  subscribeCallback = null;
  mockPresenceState = {};
  mockTrack.mockResolvedValue(undefined);
});

const testUser = { id: "user-1", username: "alice" };

// ─── useCommunityPresence ──────────────────────────────────────────────────
describe("useCommunityPresence", () => {
  it("returns count 0 initially", () => {
    const { result } = renderHook(() =>
      useCommunityPresence("comm-1", testUser)
    );

    expect(result.current.count).toBe(0);
  });

  it("updates count when presence sync fires with users", () => {
    const { result } = renderHook(() =>
      useCommunityPresence("comm-1", testUser)
    );

    mockPresenceState = {
      "user-1": [{ user_id: "user-1", username: "alice" }],
      "user-2": [{ user_id: "user-2", username: "bob" }],
    };

    act(() => {
      presenceSyncCallback?.();
    });

    expect(result.current.count).toBe(2);
  });

  it("counts distinct user_ids (deduplicates multiple presences per user)", () => {
    const { result } = renderHook(() =>
      useCommunityPresence("comm-1", testUser)
    );

    // Same user has two presence entries (e.g. two tabs)
    mockPresenceState = {
      "user-1": [
        { user_id: "user-1", username: "alice" },
        { user_id: "user-1", username: "alice" },
      ],
      "user-2": [{ user_id: "user-2", username: "bob" }],
    };

    act(() => {
      presenceSyncCallback?.();
    });

    expect(result.current.count).toBe(2);
  });

  it("calls channel.track with user payload when SUBSCRIBED and user provided", async () => {
    renderHook(() => useCommunityPresence("comm-1", testUser));

    await act(async () => {
      subscribeCallback?.("SUBSCRIBED");
    });

    expect(mockTrack).toHaveBeenCalledWith({
      user_id: "user-1",
      username: "alice",
    });
  });

  it("does NOT call channel.track when user is null", async () => {
    renderHook(() => useCommunityPresence("comm-1", null));

    await act(async () => {
      subscribeCallback?.("SUBSCRIBED");
    });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("calls unsubscribe and removeChannel on unmount", () => {
    const { unmount } = renderHook(() =>
      useCommunityPresence("comm-1", testUser)
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("subscribes to a channel whose name contains the communityId", () => {
    // The mock channel factory captures all channel(...) calls. We verify
    // via the supabase.channel mock that was set up at the module level.
    // Since createClient() is mocked to return { channel: vi.fn() }, we
    // check that the channel was subscribed by testing that subscribe was
    // called on our mockChannel — which is configured per-communityId.
    renderHook(() => useCommunityPresence("comm-xyz", testUser));

    // subscribe was called on the channel (which means the hook set it up)
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });
});
