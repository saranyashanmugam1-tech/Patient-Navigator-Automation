import { Locator, Page } from '@playwright/test';
import { ROLE_VALUE_FALLBACK } from '../config/roles';

export interface BaseUserFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * The Add / Update User form, per "Fields in the Add / Update User form, by
 * role chosen" in the use-case doc. Field lookups use accessible labels
 * (First Name*, Last Name*, Phone Number*, Email*, Password*, Confirm
 * Password*, Company*, Role*, Status*, Home Store*, Employee*, Store) since
 * those are the exact labels documented; dropdowns are assumed to be native
 * <select> elements with a custom-component fallback. Confirm/adjust against
 * the real form after the first run — see README "Selectors that may need
 * adjusting".
 */
export class UserFormPage {
  readonly page: Page;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly company: Locator;
  readonly role: Locator;
  readonly status: Locator;
  readonly homeStore: Locator;
  readonly employee: Locator;
  readonly extraStores: Locator;
  readonly addButton: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName = page.getByLabel(/first name/i);
    this.lastName = page.getByLabel(/last name/i);
    this.phone = page.getByLabel(/phone number/i);
    this.email = page.getByLabel(/^email/i);
    this.password = page.getByLabel(/^password\*?$/i).first();
    this.confirmPassword = page.getByLabel(/confirm password/i);
    this.company = page.getByLabel(/^company/i);
    this.role = page.getByLabel(/^role/i);
    this.status = page.getByLabel(/^status/i);
    this.homeStore = page.getByLabel(/home store/i);
    this.employee = page.getByLabel(/^employee/i);
    this.extraStores = page.getByLabel(/^store$/i);
    this.addButton = page.getByRole('button', { name: /^add$/i });
    this.updateButton = page.getByRole('button', { name: /^update$/i });
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i });
  }

  async fillBase(data: BaseUserFields) {
    await this.firstName.fill(data.firstName);
    await this.lastName.fill(data.lastName);
    await this.phone.fill(data.phone);
    await this.email.fill(data.email);
    if (data.password !== undefined) {
      await this.password.fill(data.password);
      await this.confirmPassword.fill(data.confirmPassword ?? data.password);
    }
  }

  private async selectDropdown(locator: Locator, label: string) {
    try {
      await locator.selectOption({ label });
      return;
    } catch {
      // not a native <select>, or no exact-label option — fall through
    }
    const fallbackValue = ROLE_VALUE_FALLBACK[label];
    if (fallbackValue) {
      try {
        await locator.selectOption({ value: fallbackValue });
        return;
      } catch {
        // fall through to custom-dropdown handling
      }
    }
    await locator.click();
    await this.page.getByRole('option', { name: label }).click();
  }

  async selectCompany(company: string) {
    await this.selectDropdown(this.company, company);
  }

  async selectRole(role: string) {
    await this.selectDropdown(this.role, role);
  }

  async selectStatus(status: 'Active' | 'Inactive') {
    await this.selectDropdown(this.status, status);
  }

  async selectHomeStore(store: string) {
    await this.selectDropdown(this.homeStore, store);
  }

  /** Picks a named employee, or the first non-placeholder option if none is given. */
  async selectEmployee(name?: string) {
    if (name) {
      await this.selectDropdown(this.employee, name);
      return;
    }
    const options = this.employee.locator('option');
    const count = await options.count().catch(() => 0);
    if (count > 1) {
      const value = await options.nth(1).getAttribute('value');
      if (value) await this.employee.selectOption(value);
    }
  }

  async selectExtraStores(stores: string[]) {
    for (const store of stores) {
      await this.extraStores.selectOption({ label: store }).catch(() => undefined);
    }
  }

  async submitAdd() {
    await this.addButton.click();
  }

  async submitUpdate() {
    await this.updateButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}
