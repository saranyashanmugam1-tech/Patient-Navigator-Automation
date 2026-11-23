import { test, expect } from '@playwright/test';
import { allowDestructiveTests } from '../../src/config/roles';

test.describe('Employee — no access to the User Registration module (EM-01..EM-05)', () => {
  test('EM-01: Administration/Users menu is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /administration/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^users$/i })).toHaveCount(0);
  });

  test('EM-02: Direct URL to the Users page is blocked', async ({ page }) => {
    const response = await page.goto('/Account/UserRegister');
    const deniedByStatus = !!response && [401, 403].includes(response.status());
    const redirectedAway = !page.url().toLowerCase().includes('/account/userregister');
    expect(deniedByStatus || redirectedAway).toBeTruthy();
  });

  test('EM-03: User management API endpoints refuse the Employee session', async ({ request }) => {
    for (const path of ['/User/GetUsers', '/User/SaveUser', '/User/UpdateUser', '/User/DeleteUser']) {
      const response = await request.post(path);
      expect(response.ok(), `${path} should be refused`).toBeFalsy();
    }
  });

  test('EM-04: Change own password', async ({ page }) => {
    // Skipped by default: this test changes the real Employee account's
    // password, which would invalidate EMPLOYEE_PASSWORD / auth/employee.json
    // for every later run. Set ALLOW_DESTRUCTIVE_TESTS=true to run it, and
    // update your .env (and re-run `npm run auth:setup -- --role=employee`)
    // afterwards.
    test.skip(!allowDestructiveTests, 'Set ALLOW_DESTRUCTIVE_TESTS=true to run (changes the real password)');

    await page.goto('/');
    await page.getByRole('button', { name: /account|profile/i }).click();
    await page.getByRole('menuitem', { name: /change password/i }).click();

    const newPassword = `Qa!${Date.now().toString().slice(-6)}`;
    await page.getByLabel(/new password/i).fill(newPassword);
    await page.getByLabel(/confirm password/i).fill(newPassword);
    await page.getByRole('button', { name: /update password|change password/i }).click();

    await expect(page.getByText('Password Changed Successfully!')).toBeVisible();
  });

  test('EM-05: Change own password rejects a policy-breaking value', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /account|profile/i }).click();
    await page.getByRole('menuitem', { name: /change password/i }).click();

    await page.getByLabel(/new password/i).fill('weak');
    await page.getByLabel(/confirm password/i).fill('different');
    await page.getByRole('button', { name: /update password|change password/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});
