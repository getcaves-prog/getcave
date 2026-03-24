import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedEmpty } from "./feed-empty";

// Mock framer-motion to avoid jsdom issues
vi.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("FeedEmpty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the grid of placeholder cards", () => {
    render(<FeedEmpty />);

    // 3 pages x 12 cards per page = 36 card buttons
    const buttons = screen.getAllByRole("button");
    // First page cards are visible, all 36 buttons rendered in DOM
    expect(buttons.length).toBe(36);
  });

  it("renders page indicator dots", () => {
    const { container } = render(<FeedEmpty />);

    // 3 page dots
    const dots = container.querySelectorAll(".rounded-full.bg-white");
    expect(dots).toHaveLength(3);
  });

  it("opens fullscreen overlay when a card is clicked", () => {
    const { container } = render(<FeedEmpty />);

    const cards = screen.getAllByRole("button");
    fireEvent.click(cards[0]);

    // After click, a fullscreen overlay button should appear
    // The overlay has the bg-black/95 class
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
  });

  it("closes fullscreen overlay when clicked", () => {
    const { container } = render(<FeedEmpty />);

    const cards = screen.getAllByRole("button");
    fireEvent.click(cards[0]);

    // Overlay should be visible
    const overlay = container.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();

    // Click the overlay to close
    fireEvent.click(overlay!);

    // Overlay should be gone
    const closedOverlay = container.querySelector(".fixed.inset-0");
    expect(closedOverlay).not.toBeInTheDocument();
  });

  it("renders 3 pages in the horizontal scroll container", () => {
    const { container } = render(<FeedEmpty />);

    // Each page has a snap-center class
    const pages = container.querySelectorAll(".snap-center");
    expect(pages).toHaveLength(3);
  });

  it("renders a 3x4 grid on each page", () => {
    const { container } = render(<FeedEmpty />);

    const grids = container.querySelectorAll(".grid-cols-3.grid-rows-4");
    expect(grids).toHaveLength(3);
  });

  it("all card buttons have type='button'", () => {
    render(<FeedEmpty />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
