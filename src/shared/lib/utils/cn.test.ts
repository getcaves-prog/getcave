import { describe, it, expect } from "vitest";
import { cn } from "@/shared/lib/utils/cn";

describe("cn", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class unchanged", () => {
    expect(cn("px-4")).toBe("px-4");
  });

  it("merges multiple class strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes via clsx syntax", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles object syntax for conditional classes", () => {
    expect(cn({ "bg-red-500": true, "bg-blue-500": false })).toBe(
      "bg-red-500"
    );
  });

  it("handles array syntax", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("resolves Tailwind conflicts by keeping the last class", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("resolves conflicting Tailwind color classes", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("handles undefined and null values", () => {
    expect(cn("px-4", undefined, null, "py-2")).toBe("px-4 py-2");
  });

  it("handles empty strings", () => {
    expect(cn("", "px-4", "")).toBe("px-4");
  });

  it("handles mixed types together", () => {
    const result = cn(
      "base",
      ["arr-class"],
      { "obj-class": true },
      undefined,
      false,
      "final"
    );
    expect(result).toContain("base");
    expect(result).toContain("arr-class");
    expect(result).toContain("obj-class");
    expect(result).toContain("final");
  });
});
