import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatPrice,
  formatEventDateRange,
} from "@/shared/lib/utils/format";

describe("formatDate", () => {
  it("formats a date string into es-MX short format", () => {
    // Use T12:00:00 to avoid timezone offset shifting the day
    const result = formatDate("2025-12-25T12:00:00");
    // es-MX: short weekday, short month, numeric day
    expect(result).toMatch(/\w+/);
    expect(result).toContain("25");
  });

  it("accepts a Date object", () => {
    const result = formatDate(new Date(2025, 0, 1));
    expect(result).toMatch(/\w+/);
    expect(result).toContain("1");
  });

  it("formats different months correctly", () => {
    const result = formatDate("2025-06-15T12:00:00");
    expect(result).toContain("15");
  });
});

describe("formatTime", () => {
  it("formats midnight (00:00) as 12:00 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats noon (12:00) as 12:00 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats morning time correctly", () => {
    expect(formatTime("09:30")).toBe("9:30 AM");
  });

  it("formats afternoon time correctly", () => {
    expect(formatTime("14:45")).toBe("2:45 PM");
  });

  it("formats 1 PM correctly", () => {
    expect(formatTime("13:00")).toBe("1:00 PM");
  });

  it("formats 11 PM correctly", () => {
    expect(formatTime("23:59")).toBe("11:59 PM");
  });

  it("formats 11 AM correctly", () => {
    expect(formatTime("11:00")).toBe("11:00 AM");
  });

  it("handles single-digit hours", () => {
    expect(formatTime("1:05")).toBe("1:05 AM");
  });
});

describe("formatPrice", () => {
  it("returns 'Gratis' for null price", () => {
    expect(formatPrice(null)).toBe("Gratis");
  });

  it("returns 'Gratis' for zero price", () => {
    expect(formatPrice(0)).toBe("Gratis");
  });

  it("formats a positive price in MXN", () => {
    const result = formatPrice(150);
    // Should contain the number 150 and a currency indicator
    expect(result).toContain("150");
  });

  it("uses MXN as default currency", () => {
    const result = formatPrice(100);
    // Intl.NumberFormat with es-MX + MXN typically includes "$"
    expect(result).toContain("$");
  });

  it("formats with a different currency", () => {
    const result = formatPrice(50, "USD");
    expect(result).toContain("50");
  });

  it("does not include fraction digits for whole numbers", () => {
    const result = formatPrice(200);
    // minimumFractionDigits: 0 means no ".00"
    expect(result).not.toMatch(/\.00/);
  });

  it("formats large numbers with grouping", () => {
    const result = formatPrice(1500);
    // Should contain the digits for 1500
    expect(result).toMatch(/1[,.]?500/);
  });
});

describe("formatEventDateRange", () => {
  it("formats date with start time only when timeEnd is null", () => {
    const result = formatEventDateRange("2025-06-15", "20:00", null);
    expect(result).toContain("·");
    expect(result).toContain("8:00 PM");
    expect(result).not.toContain("-");
  });

  it("formats date with start and end time", () => {
    const result = formatEventDateRange("2025-06-15", "20:00", "23:00");
    expect(result).toContain("·");
    expect(result).toContain("8:00 PM");
    expect(result).toContain("-");
    expect(result).toContain("11:00 PM");
  });

  it("formats morning event range", () => {
    const result = formatEventDateRange("2025-03-01", "09:00", "12:00");
    expect(result).toContain("9:00 AM");
    expect(result).toContain("12:00 PM");
  });

  it("includes the formatted date portion", () => {
    const result = formatEventDateRange("2025-12-25T12:00:00", "18:00", null);
    expect(result).toContain("25");
  });
});
