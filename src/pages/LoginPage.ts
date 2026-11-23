import { Locator, Page } from '@playwright/test';

export interface LoginCredentials {
  companyKey?: string;
  email: string;
  password: string;
}

/**
 * The sign-in page at "/" (Eyefinity Encompass admin portal).
 *
 * IMPORTANT — reCAPTCHA: this form is protected by a visible Google reCAPTCHA
 * v2 checkbox (confirmed on the live login page). This suite never solves or
 * bypasses it. `login()` is only meant to be called:
 *   1. Interactively from `scripts/setup-auth.ts`, where a human solves the
 *      checkbox once and the resulting session is saved as a Playwright
 *      storageState file that every other test reuses (no further CAPTCHA).
 *   2. Directly, in the cross-role suite's negative sign-in checks (wrong
 *      password, deactivated/deleted/locked account) — those are expected to
 *      be rejected by the server before a CAPTCHA solve would matter.
 * Calling it for a normal, valid sign-in outside of #1 will stall on the
 * CAPTCHA and time out; that is by design, not a bug in this page object.
 */
export class LoginPage {
  readonly page: Page;
  readonly companyKeyInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.companyKeyInput = page.locator('#CompanyKey');
    this.emailInput = page.locator('#Email');
    this.passwordInput = page.locator('#passwordField');
    this.loginButton = page.locator('#loginButton');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(creds: LoginCredentials) {
    await this.goto();
    if (creds.companyKey) {
      await this.companyKeyInput.fill(creds.companyKey).catch(() => undefined);
    }
    await this.emailInput.fill(creds.email);
    await this.passwordInput.fill(creds.password);
    await this.loginButton.click();
  }
}
