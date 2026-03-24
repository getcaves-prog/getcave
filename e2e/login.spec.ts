import { test, expect } from "./fixtures/auth.fixture";

test.describe("Login Page", () => {
  test("renders the Caves logo", async ({ loginPage }) => {
    await expect(loginPage.logo).toBeVisible();
  });

  test("renders the Guest button", async ({ loginPage }) => {
    await expect(loginPage.guestButton).toBeVisible();
  });

  test("renders the Log in button", async ({ loginPage }) => {
    await expect(loginPage.loginButton).toBeVisible();
  });

  test("renders the Google sign-in button", async ({ loginPage }) => {
    await expect(loginPage.googleButton).toBeVisible();
  });

  test("Guest button navigates to the feed", async ({ loginPage }) => {
    await loginPage.enterAsGuest();

    await expect(loginPage.page).toHaveURL("/");
  });

  test("Guest mode sets the guest_mode cookie", async ({ loginPage }) => {
    await loginPage.enterAsGuest();

    const cookies = await loginPage.page.context().cookies();
    const guestCookie = cookies.find((c) => c.name === "guest_mode");

    expect(guestCookie).toBeDefined();
    expect(guestCookie!.value).toBe("true");
  });
});
