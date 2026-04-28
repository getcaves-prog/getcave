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

  it("sets guest_mode cookie and navigates to home on Guest click", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByText("Guest."));

    expect(document.cookie).toContain("guest_mode=true");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("renders all buttons as type='button'", () => {
    render(<LoginForm />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
