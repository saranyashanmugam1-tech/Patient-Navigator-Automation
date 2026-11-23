import { test as base, expect } from '@playwright/test';
import { UsersPage } from '../pages/UsersPage';
import { UserFormPage } from '../pages/UserFormPage';

type Fixtures = {
  usersPage: UsersPage;
  userForm: UserFormPage;
  /** Push an email here from a test that creates a user; it is deleted automatically afterwards (per the doc's "Clean-up" precondition). */
  createdUsers: string[];
};

export const test = base.extend<Fixtures>({
  usersPage: async ({ page }, use) => {
    await use(new UsersPage(page));
  },

  userForm: async ({ page }, use) => {
    await use(new UserFormPage(page));
  },

  createdUsers: async ({ page }, use) => {
    const emails: string[] = [];
    await use(emails);

    const usersPage = new UsersPage(page);
    for (const email of emails) {
      try {
        await usersPage.goto();
        await usersPage.search(email);
        if (await usersPage.rowByEmail(email).count()) {
          await usersPage.deleteUser(email);
          await usersPage.confirmYesButton.click();
        }
      } catch (error) {
        console.warn(`Cleanup: could not delete test user ${email}:`, error);
      }
    }
  },
});

export { expect };
