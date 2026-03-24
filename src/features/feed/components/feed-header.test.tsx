import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedHeader } from "./feed-header";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("FeedHeader", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("renders the Caves logo", () => {
    render(<FeedHeader />);

    expect(screen.getByText("Caves")).toBeInTheDocument();
  });

  it("renders the menu toggle button", () => {
    render(<FeedHeader />);

    expect(screen.getByLabelText("Menu")).toBeInTheDocument();
  });

  it("renders the upload shortcut link", () => {
    render(<FeedHeader />);

    expect(screen.getByLabelText("Upload event")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload event")).toHaveAttribute(
      "href",
      "/upload"
    );
  });

  it("does not show the menu by default", () => {
    render(<FeedHeader />);

    expect(screen.queryByText("Feed")).not.toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
  });

  it("opens the menu when toggle is clicked", () => {
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));

    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("closes the menu when toggle is clicked again", () => {
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByText("Feed")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.queryByText("Feed")).not.toBeInTheDocument();
  });

  it("closes the menu when the backdrop overlay is clicked", () => {
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByText("Feed")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(screen.queryByText("Feed")).not.toBeInTheDocument();
  });

  it("closes the menu when a menu item is clicked", () => {
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));
    fireEvent.click(screen.getByText("Search"));

    expect(screen.queryByText("Feed")).not.toBeInTheDocument();
  });

  it("renders correct navigation links", () => {
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));

    const feedLink = screen.getByText("Feed").closest("a");
    const searchLink = screen.getByText("Search").closest("a");
    const uploadLink = screen.getByText("Upload").closest("a");
    const profileLink = screen.getByText("Profile").closest("a");

    expect(feedLink).toHaveAttribute("href", "/");
    expect(searchLink).toHaveAttribute("href", "/search");
    expect(uploadLink).toHaveAttribute("href", "/upload");
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("highlights the active menu item based on pathname", () => {
    mockPathname = "/search";
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));

    const searchLink = screen.getByText("Search").closest("a");
    expect(searchLink).toHaveClass("text-white");

    const feedLink = screen.getByText("Feed").closest("a");
    expect(feedLink).toHaveClass("text-[#A0A0A0]");
  });

  it("highlights Feed as active when on root path", () => {
    mockPathname = "/";
    render(<FeedHeader />);

    fireEvent.click(screen.getByLabelText("Menu"));

    const feedLink = screen.getByText("Feed").closest("a");
    expect(feedLink).toHaveClass("text-white");
  });
});
