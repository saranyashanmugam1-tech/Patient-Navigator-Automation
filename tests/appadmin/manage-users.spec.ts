import { test, expect } from '../../src/fixtures/test-fixtures';
import { testData } from '../../src/config/roles';
import { uniqueEmail, validPassword, validUser } from '../../src/utils/testData';
import { createUser } from '../shared/helpers';

test.describe('AppAdmin — Manage Users (AA-01..AA-10)', () => {
  test.beforeEach(async ({ usersPage }) => {
    await usersPage.goto();
  });

  test('AA-01: Open Manage Users', async ({ usersPage }) => {
    await expect(usersPage.grid).toBeVisible();
    await expect(usersPage.addUserButton).toBeVisible();
  });

  test('AA-02: Create an AppAdmin', async ({ page, usersPage, createdUsers }) => {
    const email = uniqueEmail('aa02appadmin');
    await createUser(page, { email, password: validPassword(), role: 'AppAdmin', company: testData.masterCompany });
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/app[ _]?admin/i);
  });

  test('AA-03: Create an Admin for any client company', async ({ page, usersPage, createdUsers }) => {
    const email = uniqueEmail('aa03admin');
    await createUser(page, {
      email,
      password: validPassword(),
      role: 'Admin',
      company: testData.clientCompany,
      homeStore: testData.homeStore1,
    });
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/admin/i);
  });

  test('AA-04: Create an Employee for any client company', async ({ page, usersPage, createdUsers }) => {
    const email = uniqueEmail('aa04employee');
    await createUser(page, {
      email,
      password: validPassword(),
      role: 'Employee',
      company: testData.clientCompany,
      homeStore: testData.homeStore1,
      extraStores: [testData.homeStore2],
    });
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/employee/i);
  });

  test('AA-05: SysAdmin is not offered', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    await userForm.selectCompany(testData.masterCompany);
    const options = (await userForm.role.locator('option').allTextContents()).join(' ');
    expect(options).not.toMatch(/sysadmin/i);
  });

  test('AA-06: Forced SysAdmin save via direct API request is refused', async ({ request }) => {
    const response = await request.post('/User/SaveUser', {
      form: {
        FirstName: validUser.firstName,
        LastName: validUser.lastName,
        PhoneNumber: validUser.phone,
        Email: uniqueEmail('aa06forcedsysadmin'),
        Role: 'SysAdmin',
        Company: testData.masterCompany,
        Status: 'Active',
      },
    });
    expect(response.ok()).toBeFalsy();
  });

  test('AA-07: SysAdmin users are protected from edit/reset/delete', async ({ usersPage }) => {
    test.skip(!testData.existingSysAdminEmail, 'Set EXISTING_SYSADMIN_EMAIL in .env to run this case');

    await usersPage.search(testData.existingSysAdminEmail);
    const row = usersPage.rowByEmail(testData.existingSysAdminEmail);
    await expect(row.locator('[title*="edit" i], [title*="reset" i], [title*="delete" i]')).toHaveCount(0);
  });

  test('AA-08: AppAdmin is not offered under a client company', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    await userForm.selectCompany(testData.clientCompany);
    const options = (await userForm.role.locator('option').allTextContents()).join(' ');
    expect(options).not.toMatch(/app[ _]?admin/i);
  });

  test('AA-09: Manage lower users (edit, deactivate, reset, delete)', async ({ page, usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('aa09manage');
    await createUser(page, {
      email,
      password: validPassword(),
      role: 'Employee',
      company: testData.clientCompany,
      homeStore: testData.homeStore1,
    });
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await userForm.lastName.fill('UpdatedByAppAdmin');
    await userForm.submitUpdate();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText('UpdatedByAppAdmin');
  });

  test('AA-10: Duplicate email is rejected', async ({ usersPage, userForm }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL in .env to run this case');

    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email: testData.existingUserEmail, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Admin');
    await userForm.selectHomeStore(testData.homeStore1);
    await userForm.submitAdd();

    await expect(userForm.page.getByText('This Email is already in use')).toBeVisible();
  });
});
