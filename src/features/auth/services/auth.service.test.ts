import { describe, it, expect, vi, beforeEach } from "vitest";
import { signIn, signUp, signOut } from "./auth.service";

const {
  mockCreateClient,
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: mockCreateClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockReturnValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  });
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

  it("should return no error on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const result = await signIn({ email: "test@example.com", password: "password123" });

    expect(result).toEqual({ error: null });
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
  });
});

describe("signUp", () => {
  it("should call supabase signUp with metadata", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    await signUp({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        data: expect.objectContaining({
          username: "newuser",
        }),
      },
    });
  });

  it("should return success on successful signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await signUp({
      email: "new@example.com",
      password: "password123",
      username: "newuser",
    });

    expect(result).toEqual({ error: null });
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
  });
});

describe("signOut", () => {
  it("should call supabase signOut", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
  });
});
