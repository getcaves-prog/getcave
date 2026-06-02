import { test, expect } from "@playwright/test";

test.describe("Infinite Canvas - Visual Verification", () => {
  test("homepage renders canvas with header", async ({ page }) => {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    // Wait for canvas to be visible
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Let flyers load

    // Screenshot: full page initial state
    await page.screenshot({
      path: "test-results/01-canvas-initial.png",
      fullPage: false,
    });

    // Check header exists
    const header = page.locator("header");
    if (await header.isVisible()) {
      await header.screenshot({
        path: "test-results/02-header-closeup.png",
      });
    }
  });

  test("mobile viewport canvas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: "test-results/03-mobile-canvas.png",
      fullPage: false,
    });
  });

  test("desktop viewport canvas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: "test-results/04-desktop-canvas.png",
      fullPage: false,
    });
  });

  test("pan simulation - drag canvas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Screenshot before pan
    await page.screenshot({
      path: "test-results/05-before-pan.png",
      fullPage: false,
    });

    // Simulate drag to pan the canvas
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(420, 250, { steps: 20 });
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Screenshot after pan
    await page.screenshot({
      path: "test-results/06-after-pan.png",
      fullPage: false,
    });
  });

  test("zoom simulation - scroll wheel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Zoom in with scroll
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "test-results/07-zoomed-in.png",
      fullPage: false,
    });

    // Zoom out
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "test-results/08-zoomed-out.png",
      fullPage: false,
    });
  });

  test("login page still works", async ({ page }) => {
    await page.goto("http://localhost:3000/auth/login", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "test-results/09-login-page.png",
      fullPage: false,
    });
  });
});
