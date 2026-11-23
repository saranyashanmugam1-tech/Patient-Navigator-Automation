import { test, expect } from '../../src/fixtures/test-fixtures';
import { testData } from '../../src/config/roles';
import { uniqueEmail, validPassword, validUser } from '../../src/utils/testData';
import { createUser } from '../shared/helpers';

test.describe('Admin — Manage Users, own company only (AD-01..AD-10)', () => {
  test.beforeEach(async ({ usersPage }) => {
    await usersPage.goto();
  });

  // Rows marked "to confirm" in the use-case doc (the own-company limit itself
  // still needs confirming by signing in as an Admin) — these assertions
  // encode the documented expectation and should be revisited once confirmed.

  test('AD-01: Grid shows only own company users', async ({ usersPage }) => {
    const rows = usersPage.grid.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(testData.clientCompany);
    }
  });

  test('AD-02: Company filter and form field are limited to own company', async ({ usersPage, userForm }) => {
    const filterOptions = (await usersPage.companyFilter.locator('option').allTextContents())
      .map((o) => o.trim())
      .filter(Boolean);
    expect(filterOptions.every((o) => o.includes(testData.clientCompany))).toBeTruthy();

    await usersPage.openAddUser();
    const formOptions = (await userForm.company.locator('option').allTextContents())
      .map((o) => o.trim())
      .filter(Boolean);
    expect(formOptions.every((o) => o.includes(testData.clientCompany))).toBeTruthy();
  });

  test('AD-03: Role list only offers Admin and Employee', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    const options = (await userForm.role.locator('option').allTextContents()).join(' ');
    expect(options).not.toMatch(/sysadmin|app[ _]?admin/i);
  });

  test('AD-04: Create an Admin for own company', async ({ page, usersPage, createdUsers }) => {
    const email = uniqueEmail('ad04admin');
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

  test('AD-05: Create an Employee for own company', async ({ page, usersPage, createdUsers }) => {
    const email = uniqueEmail('ad05employee');
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

  test('AD-06: Manage an Employee of the same company', async ({ page, usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('ad06manage');
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
    await userForm.lastName.fill('UpdatedByAdmin');
    await userForm.submitUpdate();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText('UpdatedByAdmin');
  });

  test("AD-07: Other companies' users are hidden from search", async ({ usersPage }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL (a user of a different company) to run this case');

    await usersPage.search(testData.existingUserEmail);
    await expect(usersPage.rowByEmail(testData.existingUserEmail)).toHaveCount(0);
  });

  test("AD-08: Updating another company's user via direct API request is refused", async ({ request }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL (a user of a different company) to run this case');

    const response = await request.post('/User/UpdateUser', {
      form: { Email: testData.existingUserEmail, LastName: 'HackedByAdmin' },
    });
    expect(response.ok()).toBeFalsy();
  });

  test('AD-09: Creating a SysAdmin/AppAdmin via direct API request is refused', async ({ request }) => {
    const response = await request.post('/User/SaveUser', {
      form: {
        FirstName: validUser.firstName,
        LastName: validUser.lastName,
        PhoneNumber: validUser.phone,
        Email: uniqueEmail('ad09forcedsysadmin'),
        Role: 'SysAdmin',
        Company: testData.masterCompany,
        Status: 'Active',
      },
    });
    expect(response.ok()).toBeFalsy();
  });

  test('AD-10: Duplicate email is rejected', async ({ usersPage, userForm }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL in .env to run this case');

    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email: testData.existingUserEmail, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Employee');
    await userForm.selectHomeStore(testData.homeStore1);
    await userForm.submitAdd();

    await expect(userForm.page.getByText('This Email is already in use')).toBeVisible();
  });
});
