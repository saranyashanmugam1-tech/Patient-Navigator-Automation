import { Browser, Page, expect } from '@playwright/test';
import { LoginPage, LoginCredentials } from '../../src/pages/LoginPage';
import { UsersPage } from '../../src/pages/UsersPage';
import { UserFormPage } from '../../src/pages/UserFormPage';
import { validUser } from '../../src/utils/testData';

/** Opens a fresh, isolated context signed in as `creds`, runs `fn`, then always closes the context. */
export async function withSession<T>(
  browser: Browser,
  creds: LoginCredentials,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await new LoginPage(page).login(creds);
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

export interface CreateUserData {
  email: string;
  password: string;
  role: string;
  company: string;
  homeStore?: string;
  employeeName?: string;
  extraStores?: string[];
  status?: 'Active' | 'Inactive';
}

/** Drives Administration -> Users -> Add User, per the base fields common to every role (SA-02..SA-05). */
export async function createUser(page: Page, data: CreateUserData) {
  const usersPage = new UsersPage(page);
  const form = new UserFormPage(page);

  await usersPage.goto();
  await usersPage.openAddUser();
  await form.fillBase({
    firstName: validUser.firstName,
    lastName: validUser.lastName,
    phone: validUser.phone,
    email: data.email,
    password: data.password,
  });
  await form.selectCompany(data.company);
  await form.selectRole(data.role);

  const needsStoreFields = data.role === 'Admin' || data.role === 'Employee';
  if (needsStoreFields) {
    if (data.homeStore) await form.selectHomeStore(data.homeStore);
    await form.selectEmployee(data.employeeName);
  }
  if (data.extraStores?.length) {
    await form.selectExtraStores(data.extraStores);
  }
  await form.selectStatus(data.status ?? 'Active');
  await form.submitAdd();
}

export async function deleteUser(page: Page, email: string) {
  const usersPage = new UsersPage(page);
  await usersPage.goto();
  await usersPage.search(email);
  if (await usersPage.rowByEmail(email).count()) {
    await usersPage.deleteUser(email);
    await usersPage.confirmYesButton.click();
  }
}

export async function setUserStatus(page: Page, email: string, status: 'Active' | 'Inactive') {
  const usersPage = new UsersPage(page);
  const form = new UserFormPage(page);
  await usersPage.goto();
  await usersPage.search(email);
  await usersPage.editUser(email);
  await form.selectStatus(status);
  await form.submitUpdate();
}

export async function setUserRole(page: Page, email: string, role: string) {
  const usersPage = new UsersPage(page);
  const form = new UserFormPage(page);
  await usersPage.goto();
  await usersPage.search(email);
  await usersPage.editUser(email);
  await form.selectRole(role);
  await form.submitUpdate();
}

/** Attempts a sign-in that is expected to fail, and asserts it never leaves the login page. */
export async function expectSignInBlocked(page: Page, creds: LoginCredentials) {
  await new LoginPage(page).login(creds);
  await expect(page).toHaveURL(/\/(account\/(login)?)?$/i);
}
