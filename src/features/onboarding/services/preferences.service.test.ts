import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOnboardingState,
  completeOnboarding,
  getPreferences,
  setPreferences,
} from "./preferences.service";
import type { UserPreferences } from "../types/preferences.types";

// ─── Mock Supabase client ──────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockGetUser = vi.fn();

// mockFrom is implemented per-test to support chaining
const mockFrom = vi.fn();

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────
function setupSelectChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

function setupUpdateChain(error: unknown = null) {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  return mockUpdateEq;
}

// ─── getOnboardingState ────────────────────────────────────────────────────
describe("getOnboardingState", () => {
  it("returns completed=true when onboarding_completed_at is set", async () => {
    setupSelectChain({ onboarding_completed_at: "2026-06-01T00:00:00Z" });

    const result = await getOnboardingState("user-1");

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith("onboarding_completed_at");
    expect(mockEq).toHaveBeenCalledWith("id", "user-1");
    expect(result.completed).toBe(true);
    expect(result.completedAt).toBe("2026-06-01T00:00:00Z");
  });

  it("returns completed=false when onboarding_completed_at is null", async () => {
    setupSelectChain({ onboarding_completed_at: null });

    const result = await getOnboardingState("user-1");

    expect(result.completed).toBe(false);
    expect(result.completedAt).toBeNull();
  });

  it("resolves userId from auth session when omitted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "session-user" } } });
    setupSelectChain({ onboarding_completed_at: null });

    await getOnboardingState();

    expect(mockGetUser).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "session-user");
  });

  it("throws when unauthenticated and userId is omitted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(getOnboardingState()).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    setupSelectChain(null, { message: "DB timeout" });

    await expect(getOnboardingState("user-1")).rejects.toThrow(
      "Failed to get onboarding state: DB timeout"
    );
  });
});

// ─── completeOnboarding ────────────────────────────────────────────────────
describe("completeOnboarding", () => {
  it("updates onboarding_completed_at for the current user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const mockUpdateEq = setupUpdateChain(null);

    await completeOnboarding();

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed_at: expect.any(String) })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("sets onboarding_completed_at to a valid ISO timestamp", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupUpdateChain(null);

    const before = new Date().toISOString();
    await completeOnboarding();
    const after = new Date().toISOString();

    const [[payload]] = mockUpdate.mock.calls as [[{ onboarding_completed_at: string }]];
    const ts = payload.onboarding_completed_at;
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });

  it("throws when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(completeOnboarding()).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupUpdateChain({ message: "RLS denied" });

    await expect(completeOnboarding()).rejects.toThrow(
      "Failed to complete onboarding: RLS denied"
    );
  });
});

// ─── getPreferences ────────────────────────────────────────────────────────
describe("getPreferences", () => {
  const validPrefs: UserPreferences = {
    looking_for: ["discover", "meet_people"],
    likes: "electrónica y arte urbano",
  };

  it("returns parsed UserPreferences when preferences JSONB is set", async () => {
    setupSelectChain({ preferences: validPrefs });

    const result = await getPreferences("user-1");

    expect(mockSelect).toHaveBeenCalledWith("preferences");
    expect(result).toEqual(validPrefs);
  });

  it("returns empty object when preferences is null", async () => {
    setupSelectChain({ preferences: null });

    const result = await getPreferences("user-1");

    expect(result).toEqual({});
  });

  it("returns empty object when data row is missing (no profile yet)", async () => {
    setupSelectChain(null, null);

    const result = await getPreferences("user-1");

    expect(result).toEqual({});
  });

  it("resolves userId from auth session when omitted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "session-user" } } });
    setupSelectChain({ preferences: null });

    await getPreferences();

    expect(mockEq).toHaveBeenCalledWith("id", "session-user");
  });

  it("throws when unauthenticated and userId is omitted", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(getPreferences()).rejects.toThrow("Tenés que iniciar sesión");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    setupSelectChain(null, { message: "Read failed" });

    await expect(getPreferences("user-1")).rejects.toThrow(
      "Failed to get preferences: Read failed"
    );
  });
});

// ─── setPreferences ────────────────────────────────────────────────────────
describe("setPreferences", () => {
  it("writes sanitized preferences for the current user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const mockUpdateEq = setupUpdateChain(null);

    const prefs: UserPreferences = { looking_for: ["discover"], likes: "techno" };
    await setPreferences(prefs);

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ preferences: prefs });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("strips unknown keys from the preferences object (sanitize)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupUpdateChain(null);

    // Pass an object with an unknown key that should be stripped
    const dirtyPrefs = {
      looking_for: ["discover"] as const,
      likes: "jazz",
      __admin: true, // unknown key — must be stripped
    } as unknown as UserPreferences;

    await setPreferences(dirtyPrefs);

    const [[savedPayload]] = mockUpdate.mock.calls as [[{ preferences: UserPreferences }]];
    expect(savedPayload.preferences).not.toHaveProperty("__admin");
    expect(savedPayload.preferences.looking_for).toEqual(["discover"]);
    expect(savedPayload.preferences.likes).toBe("jazz");
  });

  it("accepts empty preferences object (clear preferences)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupUpdateChain(null);

    await setPreferences({});

    expect(mockUpdate).toHaveBeenCalledWith({ preferences: {} });
  });

  it("throws when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(setPreferences({ likes: "rock" })).rejects.toThrow(
      "Tenés que iniciar sesión"
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws on Supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupUpdateChain({ message: "Write failed" });

    await expect(setPreferences({ likes: "rock" })).rejects.toThrow(
      "Failed to set preferences: Write failed"
    );
  });
});
