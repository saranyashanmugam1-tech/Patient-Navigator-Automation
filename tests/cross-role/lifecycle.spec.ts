import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { UsersPage } from '../../src/pages/UsersPage';
import { UserFormPage } from '../../src/pages/UserFormPage';
import { allowDestructiveTests, credentials, testData } from '../../src/config/roles';
import { uniqueEmail, validPassword } from '../../src/utils/testData';
import { createUser, deleteUser, expectSignInBlocked, setUserRole, setUserStatus, withSession } from '../shared/helpers';

test.describe('Cross-role — effects of Manage Users actions (CR-01..CR-07)', () => {
  test.skip(!credentials.sysadmin.email, 'SYSADMIN_EMAIL/PASSWORD are required to run the cross-role suite');

  test('CR-01: A newly created user of each role can sign in', async ({ browser }) => {
    for (const role of ['Admin', 'Employee']) {
      const email = uniqueEmail(`cr01${role.toLowerCase()}`);
      const password = validPassword();

      await withSession(browser, credentials.sysadmin, (page) =>
        createUser(page, { email, password, role, company: testData.clientCompany, homeStore: testData.homeStore1 }),
      );

      const context = await browser.newContext();
      const page = await context.newPage();
      await new LoginPage(page).login({ email, password });
      await expect(page).not.toHaveURL(/account\/login|^\/$/i);
      await context.close();

      await withSession(browser, credentials.sysadmin, (page) => deleteUser(page, email));
    }
  });

  test('CR-02: Promoting an Employee to Admin takes effect on next sign-in', async ({ browser }) => {
    const email = uniqueEmail('cr02promote');
    const password = validPassword();

    await withSession(browser, credentials.sysadmin, async (page) => {
      await createUser(page, { email, password, role: 'Employee', company: testData.clientCompany, homeStore: testData.homeStore1 });
      await setUserRole(page, email, 'Admin');
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await new LoginPage(page).login({ email, password });
    await expect(page.getByRole('link', { name: /administration/i })).toBeVisible();
    await context.close();

    await withSession(browser, credentials.sysadmin, (page) => deleteUser(page, email));
  });

  test('CR-03: Deactivated user cannot sign in', async ({ browser }) => {
    const email = uniqueEmail('cr03deactivated');
    const password = validPassword();

    await withSession(browser, credentials.sysadmin, async (page) => {
      await createUser(page, { email, password, role: 'Employee', company: testData.clientCompany, homeStore: testData.homeStore1 });
      await setUserStatus(page, email, 'Inactive');
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await expectSignInBlocked(page, { email, password });
    await context.close();

    await withSession(browser, credentials.sysadmin, (page) => deleteUser(page, email));
  });

  test('CR-04: Deleted user cannot sign in', async ({ browser }) => {
    const email = uniqueEmail('cr04deleted');
    const password = validPassword();

    await withSession(browser, credentials.sysadmin, async (page) => {
      await createUser(page, { email, password, role: 'Employee', company: testData.clientCompany, homeStore: testData.homeStore1 });
      await deleteUser(page, email);
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await expectSignInBlocked(page, { email, password });
    await context.close();
  });

  test('CR-05: Deactivating a signed-in user ends (or does not end) their session', async ({ browser }) => {
    // Open item to confirm in the use-case doc: whether the session ends
    // immediately or only on the next request. This test documents current
    // behavior rather than asserting a single expected outcome either way.
    const email = uniqueEmail('cr05liveDeactivate');
    const password = validPassword();

    await withSession(browser, credentials.sysadmin, (page) =>
      createUser(page, { email, password, role: 'Employee', company: testData.clientCompany, homeStore: testData.homeStore1 }),
    );

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await new LoginPage(userPage).login({ email, password });

    await withSession(browser, credentials.sysadmin, (page) => setUserStatus(page, email, 'Inactive'));

    const response = await userPage.goto('/');
    const signedOut = userPage.url().toLowerCase().includes('/account/login') || (response?.status() ?? 200) >= 400;
    test.info().annotations.push({
      type: 'CR-05 observed behavior',
      description: signedOut
        ? 'Deactivation ended the live session immediately.'
        : 'Deactivation did NOT end the live session immediately (session stayed active after the next request).',
    });

    await userContext.close();
    await withSession(browser, credentials.sysadmin, (page) => deleteUser(page, email));
  });

  test('CR-06: Lockout after repeated bad passwords, then unlock via reset', async ({ browser }) => {
    test.skip(
      !allowDestructiveTests,
      'Set ALLOW_DESTRUCTIVE_TESTS=true to run (repeatedly submits a wrong password and may trigger lockout policies)',
    );

    const email = uniqueEmail('cr06lockout');
    const password = validPassword();

    await withSession(browser, credentials.sysadmin, (page) =>
      createUser(page, { email, password, role: 'Employee', company: testData.clientCompany, homeStore: testData.homeStore1 }),
    );

    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);
    for (let i = 0; i < 6; i++) {
      await login.login({ email, password: 'WrongPassword!1' });
    }
    await login.login({ email, password });
    await expect(page.getByText(/locked/i)).toBeVisible();
    await context.close();

    await withSession(browser, credentials.sysadmin, async (adminPage) => {
      const usersPage = new UsersPage(adminPage);
      await usersPage.goto();
      await usersPage.search(email);
      await usersPage.resetPasswordFor(email);
      const newPassword = validPassword();
      const form = new UserFormPage(adminPage);
      await form.password.fill(newPassword);
      await form.confirmPassword.fill(newPassword);
      await form.page.getByRole('button', { name: /^(submit|reset|save)$/i }).click();

      const unlockedContext = await adminPage.context().browser()!.newContext();
      const unlockedPage = await unlockedContext.newPage();
      await new LoginPage(unlockedPage).login({ email, password: newPassword });
      await expect(unlockedPage).not.toHaveURL(/account\/login/i);
      await unlockedContext.close();
    });

    await withSession(browser, credentials.sysadmin, (page) => deleteUser(page, email));
  });

  test('CR-07: Full Employee lifecycle (SA-05 -> SA-12/13 -> sign-in -> SA-17 -> SA-20 -> SA-19 -> SA-22)', async ({ browser }) => {
    const email = uniqueEmail('cr07lifecycle');
    const password = validPassword();
    const newPassword = validPassword();

    await test.step('Create (SA-05)', () =>
      withSession(browser, credentials.sysadmin, (page) =>
        createUser(page, {
          email,
          password,
          role: 'Employee',
          company: testData.clientCompany,
          homeStore: testData.homeStore1,
          extraStores: [testData.homeStore2],
        }),
      ));

    await test.step('Find (SA-12, SA-13)', () =>
      withSession(browser, credentials.sysadmin, async (page) => {
        const usersPage = new UsersPage(page);
        await usersPage.goto();
        await usersPage.search(email);
        await expect(usersPage.rowByEmail(email)).toBeVisible();
      }));

    await test.step('Sign in as the new Employee', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await new LoginPage(page).login({ email, password });
      await expect(page).not.toHaveURL(/account\/login/i);
      await context.close();
    });

    await test.step('Promote to Admin (SA-17)', () =>
      withSession(browser, credentials.sysadmin, (page) => setUserRole(page, email, 'Admin')));

    await test.step("Reset password (SA-20)", () =>
      withSession(browser, credentials.sysadmin, async (page) => {
        const usersPage = new UsersPage(page);
        const form = new UserFormPage(page);
        await usersPage.goto();
        await usersPage.search(email);
        await usersPage.resetPasswordFor(email);
        await form.password.fill(newPassword);
        await form.confirmPassword.fill(newPassword);
        await form.page.getByRole('button', { name: /^(submit|reset|save)$/i }).click();
      }));

    await test.step('Deactivate (SA-19)', () =>
      withSession(browser, credentials.sysadmin, (page) => setUserStatus(page, email, 'Inactive')));

    await test.step('Confirm sign-in is now refused', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await expectSignInBlocked(page, { email, password: newPassword });
      await context.close();
    });

    await test.step('Delete (SA-22) and confirm gone from Active/Inactive views', () =>
      withSession(browser, credentials.sysadmin, async (page) => {
        await deleteUser(page, email);
        const usersPage = new UsersPage(page);
        for (const active of [true, false]) {
          await usersPage.filterBy({ active });
          await usersPage.search(email);
          await expect(usersPage.rowByEmail(email)).toHaveCount(0);
        }
      }));
  });
});
