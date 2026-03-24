import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "./use-profile";

const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
};

const MOCK_PROFILE = {
  id: "user-123",
  username: "testuser",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Test bio",
  city: "Mexico City",
  role: "user",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe("initial state", () => {
    it("should start with loading true, null profile, and null error", () => {
      mockGetUser.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useProfile());

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("no authenticated user", () => {
    it("should return null profile when no user is authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("successful profile fetch", () => {
    it("should fetch and return profile for authenticated user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });
      mockSingle.mockResolvedValueOnce({ data: MOCK_PROFILE, error: null });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(MOCK_PROFILE);
      expect(result.current.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", MOCK_USER.id);
    });
  });

  describe("profile fetch error", () => {
    it("should set error when profile query fails", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Profile not found" },
      });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe("Profile not found");
    });
  });

  describe("profile with null error field", () => {
    it("should handle when supabase returns data with null error", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: MOCK_USER } });
      mockSingle.mockResolvedValueOnce({ data: MOCK_PROFILE, error: null });

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(MOCK_PROFILE);
      expect(result.current.error).toBeNull();
    });
  });
});
