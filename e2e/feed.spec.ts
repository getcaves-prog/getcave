import { test, expect } from "./fixtures/auth.fixture";

test.describe("Feed Page", () => {
  test("loads the feed page as guest", async ({ guestPage }) => {
    await expect(guestPage.page).toHaveURL("/");
  });

  test("renders the feed header with Caves logo", async ({ guestPage }) => {
    const header = guestPage.page.getByRole("banner");
    await expect(header).toBeVisible();

    const logo = guestPage.page.getByText("Caves");
    await expect(logo).toBeVisible();
  });

  test("renders the placeholder grid cards", async ({ guestPage }) => {
    // The feed empty state renders a grid of placeholder cards
    const grid = guestPage.page.locator(".grid-cols-3.grid-rows-4").first();
    await expect(grid).toBeVisible();
  });

  test("card expand opens fullscreen overlay on tap", async ({
    guestPage,
  }) => {
    // Click the first card placeholder
    const firstCard = guestPage.page
      .locator(".grid-cols-3.grid-rows-4 button")
      .first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Fullscreen overlay should appear
    const overlay = guestPage.page.locator(".fixed.inset-0.z-50");
    await expect(overlay).toBeVisible();
  });

  test("card collapse closes fullscreen overlay on tap", async ({
    guestPage,
  }) => {
    const firstCard = guestPage.page
      .locator(".grid-cols-3.grid-rows-4 button")
      .first();
    await firstCard.click();

    const overlay = guestPage.page.locator(".fixed.inset-0.z-50");
    await expect(overlay).toBeVisible();

    // Tap overlay to close
    await overlay.click();
    await expect(overlay).not.toBeVisible();
  });

  test("horizontal scroll container allows swiping between pages", async ({
    guestPage,
  }) => {
    // The scroll container with snap behavior
    const scrollContainer = guestPage.page.locator(".snap-x").first();
    await expect(scrollContainer).toBeVisible();

    // Page dots should be visible
    const dots = guestPage.page.locator(".rounded-full.bg-white");
    await expect(dots.first()).toBeVisible();

    // Should have 3 page dots
    await expect(dots).toHaveCount(3);
  });
});
