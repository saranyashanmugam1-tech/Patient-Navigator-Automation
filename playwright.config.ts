import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import 'dotenv/config';
import { baseURL } from './src/config/roles';

const AUTH_DIR = path.resolve(__dirname, 'auth');

export default defineConfig({
  testDir: './tests',
  // The Users module is stateful shared data (same grid, same companies) —
  // keep each role's suite serial so tests don't race each other's creates/deletes.
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'sysadmin',
      testDir: './tests/sysadmin',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'sysadmin.json') },
    },
    {
      name: 'appadmin',
      testDir: './tests/appadmin',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'appadmin.json') },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'admin.json') },
    },
    {
      name: 'employee',
      testDir: './tests/employee',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'employee.json') },
    },
    {
      name: 'validation',
      // Field validation only needs an account that can open the Add User form;
      // SysAdmin's session covers every field in the form.
      testDir: './tests/validation',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'sysadmin.json') },
    },
    {
      name: 'cross-role',
      // These tests sign in as multiple roles themselves (new users, locked
      // accounts, deactivated accounts), so they start unauthenticated.
      testDir: './tests/cross-role',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
