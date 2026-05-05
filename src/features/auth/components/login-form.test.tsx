import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("renders logo image", () => {
    render(<LoginForm />);
    expect(screen.getByAltText("Caves")).toBeInTheDocument();
  });

  it("renders Log in and Sign up buttons in landing view", () => {
    render(<LoginForm />);
    expect(screen.getByText("Log in.")).toBeInTheDocument();
    expect(screen.getByText("Sign up.")).toBeInTheDocument();
  });

  it("renders Continue with Google button", () => {
    render(<LoginForm />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("all interactive elements are type=button or submit in landing view", () => {
    render(<LoginForm />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      const type = button.getAttribute("type");
      expect(["button", "submit"]).toContain(type);
    });
  });
});
