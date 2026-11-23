# User Registration Module — Playwright E2E Suite

Automates the use cases in **"User Registration Module – Use Cases by Role"**
against the Eyefinity Encompass admin portal's `Administration → Users`
module (`/Account/UserRegister`) at `https://connect-st-admin.icarebuddy.com/`.

Four roles are covered end to end: **SysAdmin**, **AppAdmin**, **Admin**, **Employee**,
plus cross-role effects (role changes, deactivation, deletion, lockout) and a
data-driven pass over the documented field-validation data set.

## Authentication & reCAPTCHA

The sign-in page is protected by a visible Google reCAPTCHA v2 checkbox. **This
suite never automates solving or bypassing it** — that's a deliberate choice,
not a gap to fix later.

Instead:

1. Fill in `.env` (see below) with one set of credentials per role.
2. Run `npm run auth:setup`. For each role, a real (headed) browser window
   opens, logged out, at the sign-in page — you sign in by hand, solving the
   reCAPTCHA yourself. The script watches for the redirect away from the
   login page and then saves the authenticated session to `auth/<role>.json`.
3. Every test project (see `playwright.config.ts`) reuses the matching
   `auth/<role>.json` as its Playwright `storageState`, so the automated runs
   never touch the login form (except the cross-role suite's negative
   sign-in checks, which expect to be rejected before a CAPTCHA would matter).

Re-run `npm run auth:setup -- --role=<role>` whenever that role's session
expires or its password changes. `auth/*.json` contains live session cookies
and is git-ignored — never commit it.

## Setup

```powershell
npm install
npx playwright install --with-deps chromium
Copy-Item .env.example .env
```

Edit `.env`:
- One company key / email / password per role (see "Preconditions and test
  data" in the use-case doc for which company each role belongs to).
- `EXISTING_USER_EMAIL` / `EXISTING_SYSADMIN_EMAIL` are optional — they unlock
  the duplicate-email and SysAdmin-protection checks; those tests are skipped
  if left blank.
- `ALLOW_DESTRUCTIVE_TESTS=true` unlocks two tests that are skipped by
  default because they mutate real account state: `EM-04` (changes the real
  Employee password) and `CR-06` (deliberately fails login repeatedly to
  trigger lockout).

Then capture one session per role:

```powershell
npm run auth:setup
```

## Running the tests

```powershell
npm test                  # everything
npm run test:sysadmin     # one role project at a time
npm run test:appadmin
npm run test:admin
npm run test:employee
npm run test:validation   # field validation data set
npm run test:cross-role   # multi-role lifecycle checks
npm run test:ui           # Playwright's interactive UI mode
npm run test:headed       # watch the browser while it runs
```

## Reports

Every run writes:
- `playwright-report/` — HTML report (`npm run report` opens it)
- `reports/junit.xml` — JUnit XML, for CI dashboards
- `test-results/` — traces, screenshots and video for failed tests

`.github/workflows/playwright.yml` runs the suite on push/PR and uploads the
HTML report and JUnit results as workflow artifacts. Because CI can't solve
the reCAPTCHA either, it restores each role's `auth/<role>.json` from a
base64-encoded repo secret (`PLAYWRIGHT_AUTH_SYSADMIN`, `_APPADMIN`, `_ADMIN`,
`_EMPLOYEE`) captured locally via `npm run auth:setup`:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("auth/sysadmin.json")) | Set-Clipboard
```

Paste the clipboard contents into the matching repo secret. A role whose
secret is left unset is simply skipped in CI.

## Project layout

```
src/
  config/roles.ts        Role credentials & shared test data, read from .env
  pages/                 Page Object Model: LoginPage, UsersPage, UserFormPage
  fixtures/               Playwright test fixtures (usersPage/userForm + auto user cleanup)
  utils/testData.ts       Unique email/password generators, the field-validation data set
scripts/setup-auth.ts     Interactive, human-solved login recorder (see above)
tests/
  sysadmin/               SA-01..SA-23
  appadmin/               AA-01..AA-10 (includes the AA-06 API-only check)
  admin/                  AD-01..AD-10 (includes the AD-08/AD-09 API-only checks)
  employee/               EM-01..EM-05 (includes the EM-03 API-only check)
  cross-role/             CR-01..CR-07
  validation/             Field validation data set (SA-10 / AA-10 / AD-10)
  shared/helpers.ts        withSession / createUser / deleteUser / role & status changes
auth/                     Captured storageState sessions (git-ignored)
```

Every test is a `test.step`/title mapped to its use-case ID from the source
doc, so a failing test name points straight back to the use case it covers.

## Selectors that may need adjusting

These page objects were built from the use-case doc's field names, button
labels and exact validation/success messages (which are reliable — they're
the real strings the doc says were observed on the live app), plus one
unauthenticated inspection of the public login page (`#CompanyKey`, `#Email`,
`#passwordField`, `#loginButton` are confirmed real IDs).

What's **not** yet confirmed against the real, authenticated DOM:
- The Users grid's row-action icons (edit/reset/delete) — `UsersPage` looks
  for a `title`/`aria-label` containing "edit"/"reset"/"delete" first.
- Whether Company/Role/Status/Home Store/Employee/Store are native
  `<select>` elements or a custom dropdown component — `UserFormPage`'s
  `selectDropdown()` tries `selectOption()` first and falls back to
  click-and-pick-an-option.
- The exact wording of the Add/Update/Reset "success" toasts (the doc
  doesn't quote them verbatim, unlike the validation messages).

Run the suite once against real credentials; any selector mismatch will show
up clearly in the HTML report's trace viewer (`npm run report`), and the
fixes are isolated to `src/pages/*.ts` — no test file should need to change.

## Known defects encoded as tests

`tests/validation/field-validation.spec.ts` has a
"Known defects / open items" block that encodes the doc's "Defect"/"Minor"/
"Not yet run" rows (rejected apostrophes/accents, no name length limit, the
corrupted `+1 555 010 0001` phone, the dropped 11th digit, the accepted
`0000000000` placeholder phone, the rejected `+` email). These assert the
*fixed* behavior, so they're expected to **fail** until each issue is
addressed — that failure is the point: once a fix ships, the test goes green
and stays a regression guard.
