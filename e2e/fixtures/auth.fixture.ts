import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

type AuthFixtures = {
  loginPage: LoginPage;
  guestPage: LoginPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  guestPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.enterAsGuest();
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
