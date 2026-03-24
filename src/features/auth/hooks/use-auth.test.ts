import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "./use-auth";

const mockUnsubscribe = vi.fn();
let authStateCallback: (event: string, session: { user: object } | null) => void;

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn().mockImplementation((callback) => {
  authStateCallback = callback;
  return {
    data: {
      subscription: {
        unsubscribe: mockUnsubscribe,
      },
    },
  };
});

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  signOut: vi.fn(),
}));

import { signOut as serverSignOut } from "@/features/auth/services/auth.service";

const mockServerSignOut = vi.mocked(serverSignOut);

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  describe("initial state", () => {
    it("should start with loading true and null user", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("getUser resolution", () => {
    it("should set user and stop loading after getUser resolves with a user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.error).toBeNull();
    });

    it("should set null user when getUser resolves with no user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe("auth state change subscription", () => {
    it("should subscribe to auth state changes on mount", () => {
      renderHook(() => useAuth());

      expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should update user when auth state changes to signed in", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        authStateCallback("SIGNED_IN", { user: MOCK_USER });
      });

      expect(result.current.user).toEqual(MOCK_USER);
    });

    it("should clear user when auth state changes to signed out", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_USER);
      });

      act(() => {
        authStateCallback("SIGNED_OUT", null);
      });

      expect(result.current.user).toBeNull();
    });

    it("should unsubscribe from auth state changes on unmount", async () => {
      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledOnce();
    });
  });

  describe("signOut", () => {
    it("should call serverSignOut when signOut is invoked", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });
      mockServerSignOut.mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(MOCK_USER);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockServerSignOut).toHaveBeenCalledOnce();
    });
  });
});
