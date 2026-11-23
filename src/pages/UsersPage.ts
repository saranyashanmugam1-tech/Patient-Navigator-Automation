import { Locator, Page } from '@playwright/test';

/**
 * Administration -> Users grid (/Account/UserRegister).
 *
 * Selectors for the grid's row-action icons (edit/reset/delete) and the
 * Company/Role/Active filters are best-effort, built from the use-case doc's
 * descriptions ("Pencil icon", "Reset icon", "Bin icon", "Company filter and
 * the form's Company field", etc.) rather than from an authenticated DOM
 * inspection. Confirm/adjust them against the real page after the first run
 * — see README "Selectors that may need adjusting".
 */
export class UsersPage {
  readonly page: Page;
  readonly addUserButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly companyFilter: Locator;
  readonly roleFilter: Locator;
  readonly activeFilter: Locator;
  readonly filterButton: Locator;
  readonly grid: Locator;
  readonly confirmYesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addUserButton = page.getByRole('button', { name: /add user/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.searchButton = page.getByRole('button', { name: /^search$/i });
    this.companyFilter = page.locator('select[name="Company" i], #Company').first();
    this.roleFilter = page.locator('select[name="Role" i], #Role').first();
    this.activeFilter = page.locator('input[type="checkbox"][name*="active" i], #Active').first();
    this.filterButton = page.getByRole('button', { name: /^filter$/i });
    this.grid = page.locator('table').first();
    this.confirmYesButton = page.getByRole('button', { name: /^yes$/i });
  }

  async goto() {
    await this.page.goto('/Account/UserRegister');
    await this.grid.waitFor({ state: 'visible' }).catch(() => undefined);
  }

  async openAddUser() {
    await this.addUserButton.click();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async filterBy(opts: { company?: string; role?: string; active?: boolean }) {
    if (opts.company) {
      await this.companyFilter.selectOption({ label: opts.company }).catch(() => undefined);
    }
    if (opts.role) {
      await this.roleFilter.selectOption({ label: opts.role }).catch(() => undefined);
    }
    if (opts.active !== undefined) {
      const checked = await this.activeFilter.isChecked().catch(() => true);
      if (checked !== opts.active) {
        await this.activeFilter.click().catch(() => undefined);
      }
    }
    await this.filterButton.click();
  }

  rowByEmail(email: string): Locator {
    return this.grid.locator('tr', { hasText: email });
  }

  private rowAction(email: string, namePattern: RegExp, titleWord: string): Locator {
    const row = this.rowByEmail(email);
    return row
      .getByRole('button', { name: namePattern })
      .or(row.locator(`[title*="${titleWord}" i]`))
      .or(row.locator(`[aria-label*="${titleWord}" i]`))
      .first();
  }

  async editUser(email: string) {
    await this.rowAction(email, /edit/i, 'edit').click();
  }

  async resetPasswordFor(email: string) {
    await this.rowAction(email, /reset/i, 'reset').click();
  }

  async deleteUser(email: string) {
    await this.rowAction(email, /delete|remove/i, 'delete').click();
  }
}
