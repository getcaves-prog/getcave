import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import {
  getProfile,
  getProfileWithEvents,
  updateProfile,
  uploadAvatar,
} from "./profile.service";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockProfileSelect = vi.fn(() => ({ eq: mockEq }));
const mockOrder = vi.fn();
const mockEventsEq = vi.fn(() => ({ order: mockOrder }));
const mockEventsSelect = vi.fn(() => ({ eq: mockEventsEq }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockUpdateEq = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: mockProfileSelect,
            update: mockUpdate,
          };
        }
        if (table === "events") {
          return {
            select: mockEventsSelect,
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn(() => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        })),
      },
    })
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockProfileSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
  mockEventsSelect.mockReturnValue({ eq: mockEventsEq });
  mockEventsEq.mockReturnValue({ order: mockOrder });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
});

describe("getProfile", () => {
  it("should return null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await getProfile();

    expect(result).toBeNull();
  });

  it("should return profile for authenticated user", async () => {
    const mockProfile = {
      id: "user-123",
      username: "testuser",
      bio: "Hello",
      avatar_url: null,
    };
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({ data: mockProfile });

    const result = await getProfile();

    expect(result).toEqual(mockProfile);
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
  });

  it("should return null when profile query returns null data", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({ data: null });

    const result = await getProfile();

    expect(result).toBeNull();
  });
});

describe("getProfileWithEvents", () => {
  it("should return null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await getProfileWithEvents();

    expect(result).toBeNull();
  });

  it("should return null when profile is not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({ data: null });

    const result = await getProfileWithEvents();

    expect(result).toBeNull();
  });

  it("should return profile with events on success", async () => {
    const mockProfile = {
      id: "user-123",
      username: "testuser",
      bio: null,
      avatar_url: null,
    };
    const mockEvents = [
      {
        id: "evt-1",
        title: "My Event",
        categories: { name: "Music", icon: "🎵" },
      },
    ];

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({ data: mockProfile });
    mockOrder.mockResolvedValue({ data: mockEvents });

    const result = await getProfileWithEvents();

    expect(result).toEqual({
      ...mockProfile,
      events: mockEvents,
    });
    expect(mockEventsEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockOrder).toHaveBeenCalledWith("date", { ascending: false });
  });

  it("should return empty events array when events query returns null", async () => {
    const mockProfile = {
      id: "user-123",
      username: "testuser",
      bio: null,
      avatar_url: null,
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockSingle.mockResolvedValue({ data: mockProfile });
    mockOrder.mockResolvedValue({ data: null });

    const result = await getProfileWithEvents();

    expect(result).toEqual({
      ...mockProfile,
      events: [],
    });
  });
});

describe("updateProfile", () => {
  it("should return error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    const result = await updateProfile(formData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("should update profile and redirect on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set("username", "newname");
    formData.set("bio", "New bio");
    formData.set("avatar_url", "https://example.com/avatar.webp");

    await updateProfile(formData);

    expect(mockUpdate).toHaveBeenCalledWith({
      username: "newname",
      bio: "New bio",
      avatar_url: "https://example.com/avatar.webp",
    });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-123");
    expect(redirect).toHaveBeenCalledWith("/profile");
  });

  it("should set bio and avatar_url to null when empty strings", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set("username", "testuser");
    formData.set("bio", "");
    formData.set("avatar_url", "");

    await updateProfile(formData);

    expect(mockUpdate).toHaveBeenCalledWith({
      username: "testuser",
      bio: null,
      avatar_url: null,
    });
  });

  it("should set username to undefined when empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set("username", "");
    formData.set("bio", "");
    formData.set("avatar_url", "");

    await updateProfile(formData);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        username: undefined,
      })
    );
  });

  it("should return error on update failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpdateEq.mockResolvedValue({
      error: { message: "Username taken" },
    });

    const formData = new FormData();
    formData.set("username", "taken");
    formData.set("bio", "");
    formData.set("avatar_url", "");

    const result = await updateProfile(formData);

    expect(result).toEqual({ error: "Username taken" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("uploadAvatar", () => {
  it("should return error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    const result = await uploadAvatar(formData);

    expect(result).toEqual({ error: "Not authenticated", url: null });
  });

  it("should return error when no file is provided", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const formData = new FormData();
    const result = await uploadAvatar(formData);

    expect(result).toEqual({ error: "No file provided", url: null });
  });

  it("should upload avatar and return public url on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.test/avatars/user-123/avatar.webp" },
    });

    const file = new File(["image-data"], "avatar.webp", {
      type: "image/webp",
    });
    const formData = new FormData();
    formData.set("avatar", file);

    const result = await uploadAvatar(formData);

    expect(mockUpload).toHaveBeenCalledWith(
      "user-123/avatar.webp",
      expect.any(File),
      { upsert: true, contentType: "image/webp" }
    );
    expect(result).toEqual({
      error: null,
      url: "https://storage.test/avatars/user-123/avatar.webp",
    });
  });

  it("should return error on upload failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockUpload.mockResolvedValue({
      error: { message: "File too large" },
    });

    const file = new File(["image-data"], "avatar.webp", {
      type: "image/webp",
    });
    const formData = new FormData();
    formData.set("avatar", file);

    const result = await uploadAvatar(formData);

    expect(result).toEqual({ error: "File too large", url: null });
  });
});
