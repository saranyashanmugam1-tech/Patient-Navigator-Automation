/**
 * Interactive, one-time login recorder.
 *
 * The admin portal's sign-in form is protected by a visible Google reCAPTCHA
 * v2 checkbox. This suite deliberately never automates solving or bypassing
 * it. Instead, this script opens a real, headed browser window per role, a
 * human signs in (ticking the reCAPTCHA checkbox themselves), and the
 * resulting authenticated session is saved to auth/<role>.json as a
 * Playwright storageState file. Every test project then reuses that saved
 * session (see playwright.config.ts), so the CAPTCHA is only ever solved by
 * a person, exactly once per role, not by the automation.
 *
 * Usage:
 *   npm run auth:setup                # capture all 4 roles
 *   npm run auth:setup -- --role=sysadmin --role=admin
 *
 * Re-run for a role whenever its saved session expires or its password changes.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { baseURL, credentials, RoleKey, roleKeys } from '../src/config/roles';

const AUTH_DIR = path.resolve(__dirname, '../auth');

async function recordRole(role: RoleKey) {
  const creds = credentials[role];
  console.log(`\n=== ${role.toUpperCase()} ===`);

  if (!creds.email) {
    console.log(`Skipping: set ${role.toUpperCase()}_EMAIL (and _PASSWORD) in .env first.`);
    return;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseURL);

  console.log(`A browser window has opened for the ${role} login.`);
  console.log(`Sign in as ${creds.email}, solve the reCAPTCHA, and wait for the admin dashboard to load.`);
  console.log('Waiting up to 3 minutes for you to finish signing in...');

  try {
    await page.waitForURL(
      (url) => {
        const p = url.pathname.toLowerCase();
        return p !== '/' && !p.includes('/account/login');
      },
      { timeout: 180_000 },
    );
    console.log('Detected navigation away from the login page.');
  } catch {
    console.log('Timed out waiting for navigation — saving the current session state anyway.');
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const outFile = path.join(AUTH_DIR, `${role}.json`);
  await context.storageState({ path: outFile });
  console.log(`Saved session -> ${outFile}`);

  await browser.close();
}

async function main() {
  const requested = process.argv
    .slice(2)
    .map((arg) => arg.match(/^--role=(.+)$/)?.[1])
    .filter((v): v is string => !!v) as RoleKey[];

  const roles = requested.length ? requested : roleKeys;
  for (const role of roles) {
    await recordRole(role);
  }
  console.log('\nDone. Run `npm test` to execute the suite against the saved sessions.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
