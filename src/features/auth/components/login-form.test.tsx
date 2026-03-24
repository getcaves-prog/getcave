import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginForm } from "./login-form";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "guest_mode=; max-age=0";
  });

  it("renders the Caves logo", () => {
    render(<LoginForm />);

    expect(screen.getByText("Caves")).toBeInTheDocument();
  });

  it("renders Guest and Log in buttons", () => {
    render(<LoginForm />);

    expect(screen.getByText("Guest.")).toBeInTheDocument();
    expect(screen.getByText("Log in.")).toBeInTheDocument();
  });

  it("renders the Google sign-in button with accessible label", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Sign in with Google")).toBeInTheDocument();
  });

  it("sets guest_mode cookie and navigates to home on Guest click", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByText("Guest."));

    expect(document.cookie).toContain("guest_mode=true");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("calls signInWithOAuth with Google provider on Log in click", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByText("Log in."));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("calls signInWithOAuth when Google icon button is clicked", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByLabelText("Sign in with Google"));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("renders all buttons as type='button'", () => {
    render(<LoginForm />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
