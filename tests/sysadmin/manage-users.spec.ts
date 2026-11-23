import { test, expect } from '../../src/fixtures/test-fixtures';
import { testData } from '../../src/config/roles';
import { uniqueEmail, validPassword, validUser } from '../../src/utils/testData';

test.describe('SysAdmin — Manage Users (SA-01..SA-23)', () => {
  test.beforeEach(async ({ usersPage }) => {
    await usersPage.goto();
  });

  test('SA-01: Open Manage Users', async ({ usersPage }) => {
    await expect(usersPage.grid).toBeVisible();
    await expect(usersPage.addUserButton).toBeVisible();
  });

  test('SA-02: Create a SysAdmin', async ({ page, usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa02sysadmin');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.selectStatus('Active');
    await userForm.submitAdd();
    createdUsers.push(email);

    await expect(page.getByText(/success/i)).toBeVisible();
    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/sysadmin/i);
    await expect(usersPage.rowByEmail(email)).toContainText(/active/i);
  });

  test('SA-03: Create an AppAdmin', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa03appadmin');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('AppAdmin');
    await userForm.selectStatus('Active');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/app[ _]?admin/i);
    // No store/employee fields for AppAdmin, per the "Fields in the Add/Update form" table.
    await expect(userForm.homeStore).toBeHidden();
  });

  test('SA-04: Create an Admin for a client company', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa04admin');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Admin');
    await userForm.selectHomeStore(testData.homeStore1);
    await userForm.selectEmployee();
    await userForm.selectStatus('Active');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/admin/i);
  });

  test('SA-05: Create an Employee for a client company', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa05employee');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Employee');
    await userForm.selectHomeStore(testData.homeStore1);
    await userForm.selectEmployee();
    await userForm.selectExtraStores([testData.homeStore2, testData.homeStore3]);
    await userForm.selectStatus('Active');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/employee/i);
  });

  test('SA-06: SysAdmin/AppAdmin are not offered under a client company', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    await userForm.selectCompany(testData.clientCompany);
    const options = (await userForm.role.locator('option').allTextContents()).join(' ');
    expect(options).not.toMatch(/sysadmin/i);
    expect(options).not.toMatch(/app[ _]?admin/i);
  });

  test('SA-07: Admin/Employee without store data is blocked', async ({ usersPage, userForm }) => {
    const email = uniqueEmail('sa07nostore');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Admin');
    await userForm.submitAdd();

    await expect(userForm.page.getByText('Please select Home Store.')).toBeVisible();
    await expect(userForm.page.getByText('Please select an employee.')).toBeVisible();
  });

  test('SA-08: Home Store with no staff shows "No Employee Found"', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Admin');
    await userForm.selectHomeStore(testData.homeStoreDefault);
    await expect(userForm.page.getByText('No Employee Found')).toBeVisible();
  });

  test('SA-09: Duplicate email (different case) is rejected', async ({ usersPage, userForm }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL in .env to run this case');
    const dupEmail = testData.existingUserEmail.toUpperCase();

    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email: dupEmail, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();

    await expect(userForm.page.getByText('This Email is already in use')).toBeVisible();
  });

  test('SA-11: Cancel closes the form without saving', async ({ usersPage, userForm }) => {
    await usersPage.openAddUser();
    await userForm.firstName.fill('Temp');
    await userForm.lastName.fill('Discard');
    await userForm.cancel();

    await usersPage.openAddUser();
    await expect(userForm.firstName).toHaveValue('');
    await expect(userForm.lastName).toHaveValue('');
  });

  test('SA-12: Search matches by partial name/email, case-insensitive', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa12search');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email.toUpperCase());
    await expect(usersPage.rowByEmail(email)).toBeVisible();
  });

  test('SA-13: Filter by company, role and active', async ({ usersPage }) => {
    await usersPage.filterBy({ company: testData.masterCompany, role: 'SysAdmin', active: true });
    await expect(usersPage.grid.locator('tbody tr').first()).toBeVisible();
    await expect(usersPage.grid).not.toContainText(testData.clientCompany);
  });

  test('SA-14: Show inactive users', async ({ usersPage }) => {
    await usersPage.filterBy({ active: false });
    await expect(usersPage.grid).toBeVisible();
  });

  test('SA-15: Sort and page the grid', async ({ usersPage }) => {
    const header = usersPage.grid.locator('th').first();
    await header.click();
    await header.click();
    await expect(usersPage.grid).toBeVisible();
  });

  test('SA-16: Edit a user', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa16edit');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await expect(userForm.updateButton).toBeVisible();
    await userForm.lastName.fill('TesterUpdated');
    await userForm.submitUpdate();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText('TesterUpdated');
  });

  test('SA-17: Change role from Employee to Admin', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa17rolechange');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.clientCompany);
    await userForm.selectRole('Employee');
    await userForm.selectHomeStore(testData.homeStore1);
    await userForm.selectEmployee();
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await userForm.selectRole('Admin');
    await userForm.submitUpdate();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/admin/i);
  });

  test("SA-18: Changing email to another user's (different case) is rejected", async ({ usersPage, userForm, createdUsers }) => {
    test.skip(!testData.existingUserEmail, 'Set EXISTING_USER_EMAIL in .env to run this case');

    const email = uniqueEmail('sa18editemail');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await userForm.email.fill(testData.existingUserEmail.toUpperCase());
    await userForm.submitUpdate();

    await expect(userForm.page.getByText('This Email is already in use')).toBeVisible();
  });

  test('SA-19: Deactivate and reactivate a user', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa19deactivate');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await userForm.selectStatus('Inactive');
    await userForm.submitUpdate();

    await usersPage.filterBy({ active: true });
    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toHaveCount(0);

    await usersPage.search(email);
    await usersPage.editUser(email);
    await userForm.selectStatus('Active');
    await userForm.submitUpdate();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toContainText(/active/i);
  });

  test("SA-20: Reset a user's password", async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa20reset');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.resetPasswordFor(email);
    const newPassword = validPassword();
    await userForm.password.fill(newPassword);
    await userForm.confirmPassword.fill(newPassword);
    await userForm.page.getByRole('button', { name: /^(submit|reset|save)$/i }).click();

    await expect(userForm.page.getByText(/success/i)).toBeVisible();
  });

  test('SA-21: Reset with blank or mismatched passwords is rejected', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa21badreset');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.resetPasswordFor(email);
    await userForm.page.getByRole('button', { name: /^(submit|reset|save)$/i }).click();
    await expect(userForm.page.getByText(/password cannot be empty/i)).toBeVisible();

    await userForm.password.fill('Qa!111111');
    await userForm.confirmPassword.fill('Qa!222222');
    await userForm.page.getByRole('button', { name: /^(submit|reset|save)$/i }).click();
    await expect(userForm.page.getByText(/do not match|mismatch/i)).toBeVisible();
  });

  test('SA-22: Delete a user', async ({ usersPage, userForm }) => {
    const email = uniqueEmail('sa22delete');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();

    await usersPage.search(email);
    await usersPage.deleteUser(email);
    await expect(userForm.page.getByText(new RegExp(`are you sure.*remove.*${email}`, 'i'))).toBeVisible();
    await usersPage.confirmYesButton.click();

    await expect(userForm.page.getByText(/user deleted successfully/i)).toBeVisible();
    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toHaveCount(0);
  });

  test('SA-23: Cancel delete leaves the user unchanged', async ({ usersPage, userForm, createdUsers }) => {
    const email = uniqueEmail('sa23canceldelete');
    await usersPage.openAddUser();
    await userForm.fillBase({ ...validUser, email, password: validPassword() });
    await userForm.selectCompany(testData.masterCompany);
    await userForm.selectRole('SysAdmin');
    await userForm.submitAdd();
    createdUsers.push(email);

    await usersPage.search(email);
    await usersPage.deleteUser(email);
    await userForm.page.getByRole('button', { name: /^(no|cancel)$/i }).click();

    await usersPage.search(email);
    await expect(usersPage.rowByEmail(email)).toBeVisible();
  });
});
