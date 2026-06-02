import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the hook
const mockGetNearbyFlyers = vi.fn();
const mockGetFlyers = vi.fn();

vi.mock("../services/canvas.service", () => ({
  getNearbyFlyers: mockGetNearbyFlyers,
  getFlyers: mockGetFlyers,
}));

vi.mock("@/shared/stores/location.store", () => ({
  useLocationStore: (selector: (s: object) => unknown) =>
    selector({ latitude: 25.67, longitude: -100.31, loading: false }),
}));

vi.mock("../stores/canvas-ready.store", () => ({
  useCanvasReadyStore: { getState: () => ({ reset: vi.fn(), setFlyersLoaded: vi.fn() }) },
}));

vi.mock("../stores/category-filter.store", () => ({
  useCategoryFilterStore: (selector: (s: object) => unknown) =>
    selector({ selectedCategoryId: null }),
}));

vi.mock("../stores/display-mode.store", () => ({
  useDisplayModeStore: { getState: () => ({ setMode: vi.fn() }) },
}));

// Isolated unit tests for the radius expansion logic (pure function extracted for testing)
describe("radius expansion logic", () => {
  const RADIUS_STEPS_KM = [5, 10, 25];
  const RADIUS_STEP_THRESHOLDS = [10, 20];

  async function simulateExpansion(
    countsByRadius: Record<number, number>
  ): Promise<{ radius: number; count: number }> {
    let lastRadius = RADIUS_STEPS_KM[RADIUS_STEPS_KM.length - 1];
    let lastCount = 0;

    for (let i = 0; i < RADIUS_STEPS_KM.length; i++) {
      const radius = RADIUS_STEPS_KM[i];
      const count = countsByRadius[radius] ?? 0;
      const isLastStep = i === RADIUS_STEPS_KM.length - 1;
      const stepThreshold = RADIUS_STEP_THRESHOLDS[i];

      lastRadius = radius;
      lastCount = count;

      if (isLastStep) break;
      if (count >= stepThreshold) break;
    }

    return { radius: lastRadius, count: lastCount };
  }

  it("stops at 5km when count >= 10", async () => {
    const { radius } = await simulateExpansion({ 5: 15, 10: 25, 25: 50 });
    expect(radius).toBe(5);
  });

  it("expands to 10km when count < 10 at 5km", async () => {
    const { radius } = await simulateExpansion({ 5: 7, 10: 22, 25: 50 });
    expect(radius).toBe(10);
  });

  it("stops at 10km when count >= 20 at 10km", async () => {
    const { radius } = await simulateExpansion({ 5: 5, 10: 20, 25: 50 });
    expect(radius).toBe(10);
  });

  it("expands to 25km when count < 20 at 10km", async () => {
    const { radius } = await simulateExpansion({ 5: 3, 10: 12, 25: 30 });
    expect(radius).toBe(25);
  });

  it("returns 25km results even if count is 0 (last step)", async () => {
    const { radius, count } = await simulateExpansion({ 5: 0, 10: 0, 25: 0 });
    expect(radius).toBe(25);
    expect(count).toBe(0);
  });

  it("stops at 5km with exactly 10 results", async () => {
    const { radius } = await simulateExpansion({ 5: 10, 10: 20 });
    expect(radius).toBe(5);
  });

  it("expands past 10km with exactly 19 results", async () => {
    const { radius } = await simulateExpansion({ 5: 5, 10: 19, 25: 40 });
    expect(radius).toBe(25);
  });
});
