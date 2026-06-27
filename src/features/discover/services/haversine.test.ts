import { describe, it, expect } from "vitest";
import { haversineKm } from "./haversine";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(25.6, -100.3, 25.6, -100.3)).toBe(0);
  });

  it("computes a known short distance (Monterrey ~ Guadalupe, ~8km)", () => {
    // Monterrey centro vs Guadalupe NL — roughly 8 km apart.
    const km = haversineKm(25.6866, -100.3161, 25.6767, -100.2563);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(12);
  });

  it("computes a known long distance (Monterrey -> Madrid, ~9000km)", () => {
    const km = haversineKm(25.6866, -100.3161, 40.4168, -3.7038);
    expect(km).toBeGreaterThan(8500);
    expect(km).toBeLessThan(9500);
  });

  it("is symmetric", () => {
    const a = haversineKm(25.6, -100.3, 19.4, -99.1);
    const b = haversineKm(19.4, -99.1, 25.6, -100.3);
    expect(Math.abs(a - b)).toBeLessThan(1e-6);
  });
});
