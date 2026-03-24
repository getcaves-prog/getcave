import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly guestButton: Locator;
  readonly loginButton: Locator;
  readonly googleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.getByText("Caves");
    this.guestButton = page.getByRole("button", { name: "Guest." });
    this.loginButton = page.getByRole("button", { name: "Log in." });
    this.googleButton = page.getByRole("button", {
      name: "Sign in with Google",
    });
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async enterAsGuest() {
    await this.guestButton.click();
    await this.page.waitForURL("/");
  }
}
