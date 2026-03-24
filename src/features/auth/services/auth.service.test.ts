import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { signIn, signUp, signOut } from "./auth.service";

const mockInsert = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
      },
      from: () => ({
        insert: mockInsert,
      }),
    })
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signIn", () => {
  it("should call signInWithPassword with correct credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    await signIn({ email: "test@example.com", password: "password123" });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("should redirect to / on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    await signIn({ email: "test@example.com", password: "password123" });

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("should return error message on auth failure", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await signIn({
      email: "test@example.com",
      password: "wrong",
    });

    expect(result).toEqual({ error: "Invalid login credentials" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("signUp", () => {
  it("should call supabase signUp with email and password", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });

    await signUp({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
    });
  });

  it("should create profile after successful signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });

    const result = await signUp({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
    });

    expect(mockInsert).toHaveBeenCalledWith({
      id: "user-123",
      username: "newuser",
    });
    expect(result).toEqual({ error: null, requiresConfirmation: true });
  });

  it("should return error on signup failure", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "Email already registered" },
    });

    const result = await signUp({
      email: "existing@example.com",
      password: "password123",
      username: "existing",
    });

    expect(result).toEqual({ error: "Email already registered" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should return error on profile creation failure", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockInsert.mockResolvedValue({
      error: { message: "Username already taken" },
    });

    const result = await signUp({
      email: "new@example.com",
      password: "password123",
      username: "taken",
    });

    expect(result).toEqual({ error: "Username already taken" });
  });

  it("should skip profile creation when user is null in response", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await signUp({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
    });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result).toEqual({ error: null, requiresConfirmation: true });
  });
});

describe("signOut", () => {
  it("should call supabase signOut and redirect", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
