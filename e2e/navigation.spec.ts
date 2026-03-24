import { test, expect } from "./fixtures/auth.fixture";

test.describe("Navigation", () => {
  test("header menu button opens the navigation menu", async ({
    guestPage,
  }) => {
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    await expect(guestPage.page.getByText("Feed")).toBeVisible();
    await expect(guestPage.page.getByText("Search")).toBeVisible();
    await expect(guestPage.page.getByText("Upload")).toBeVisible();
    await expect(guestPage.page.getByText("Profile")).toBeVisible();
  });

  test("menu closes when backdrop is tapped", async ({ guestPage }) => {
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    await expect(guestPage.page.getByText("Feed")).toBeVisible();

    const closeButton = guestPage.page.getByRole("button", {
      name: "Close menu",
    });
    await closeButton.click();

    await expect(guestPage.page.getByText("Feed")).not.toBeVisible();
  });

  test("Search link navigates to /search", async ({ guestPage }) => {
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    await guestPage.page.getByRole("link", { name: "Search" }).click();
    await guestPage.page.waitForURL("/search");

    await expect(guestPage.page).toHaveURL("/search");
  });

  test("Upload link navigates to /upload", async ({ guestPage }) => {
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    await guestPage.page.getByRole("link", { name: "Upload" }).click();
    await guestPage.page.waitForURL("/upload");

    await expect(guestPage.page).toHaveURL("/upload");
  });

  test("Profile link navigates to /profile", async ({ guestPage }) => {
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    await guestPage.page.getByRole("link", { name: "Profile" }).click();
    await guestPage.page.waitForURL("/profile");

    await expect(guestPage.page).toHaveURL("/profile");
  });

  test("Upload event shortcut in header links to /upload", async ({
    guestPage,
  }) => {
    const uploadLink = guestPage.page.getByRole("link", {
      name: "Upload event",
    });
    await expect(uploadLink).toBeVisible();

    await uploadLink.click();
    await guestPage.page.waitForURL("/upload");

    await expect(guestPage.page).toHaveURL("/upload");
  });

  test("Feed link navigates back to home", async ({ guestPage }) => {
    // Navigate away first
    const menuButton = guestPage.page.getByRole("button", { name: "Menu" });
    await menuButton.click();

    await guestPage.page.getByRole("link", { name: "Search" }).click();
    await guestPage.page.waitForURL("/search");

    // Open menu again and go to Feed
    await guestPage.page.getByRole("button", { name: "Menu" }).click();
    await guestPage.page.getByRole("link", { name: "Feed" }).click();
    await guestPage.page.waitForURL("/");

    await expect(guestPage.page).toHaveURL("/");
  });
});
