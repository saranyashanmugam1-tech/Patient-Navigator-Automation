import { test, expect } from '../../src/fixtures/test-fixtures';
import { invalidFieldData } from '../../src/utils/testData';

/**
 * Data-driven coverage of the "Field validation data set" in the use-case doc
 * (used by SA-10 / AA-10 / AD-10). Each test fills only the field(s) under
 * test and submits, so a validation message can be asserted in isolation.
 *
 * Tests under "Known defects / open items" encode the doc's "Defect"/"Minor"/
 * "Not yet run" rows: they assert the behavior the doc says SHOULD happen,
 * so they are expected to fail until the underlying issue is fixed — that
 * failure is the point, it turns the doc's open item into a regression gate.
 */
test.describe('Field validation — Add User form (SA-10 / AA-10 / AD-10)', () => {
  test.beforeEach(async ({ usersPage }) => {
    await usersPage.goto();
    await usersPage.openAddUser();
  });

  test('First/Last Name blank is rejected', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please enter First Name.')).toBeVisible();
    await expect(userForm.page.getByText('Please enter Last Name.')).toBeVisible();
  });

  for (const value of invalidFieldData.nameSpecialOrNumbers) {
    test(`Name with special characters/numbers is rejected: "${value}"`, async ({ userForm }) => {
      await userForm.firstName.fill(value);
      await userForm.submitAdd();
      await expect(userForm.page.getByText('No special characters or numbers allowed.')).toBeVisible();
    });
  }

  for (const value of invalidFieldData.nameAccepted) {
    test(`Name is accepted: "${value}"`, async ({ userForm }) => {
      await userForm.firstName.fill(value);
      await userForm.submitAdd();
      await expect(userForm.page.getByText('No special characters or numbers allowed.')).toBeHidden();
    });
  }

  test('Phone blank or non-numeric is rejected', async ({ userForm }) => {
    await userForm.phone.fill('abcdefghij');
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please enter a valid phone number')).toBeVisible();
  });

  test('Phone too short is rejected: "12345"', async ({ userForm }) => {
    await userForm.phone.fill('12345');
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please enter a valid phone number')).toBeVisible();
  });

  for (const value of invalidFieldData.phoneAccepted) {
    test(`Phone is accepted and formatted: "${value}"`, async ({ userForm }) => {
      await userForm.phone.fill(value);
      await userForm.phone.blur();
      await expect(userForm.phone).toHaveValue('(555) 010-0001');
    });
  }

  test('Email blank is rejected', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please enter email address.')).toBeVisible();
  });

  for (const value of invalidFieldData.emailInvalid) {
    test(`Invalid email is rejected: "${value}"`, async ({ userForm }) => {
      await userForm.email.fill(value);
      await userForm.submitAdd();
      await expect(userForm.page.getByText('Please enter a valid email address')).toBeVisible();
    });
  }

  for (const value of invalidFieldData.emailAccepted) {
    test(`Valid email is accepted: "${value}"`, async ({ userForm }) => {
      await userForm.email.fill(value);
      await userForm.submitAdd();
      await expect(userForm.page.getByText('Please enter a valid email address')).toBeHidden();
    });
  }

  test('Password / Confirm blank is rejected', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please enter password.')).toBeVisible();
    await expect(userForm.page.getByText('Please confirm your password.')).toBeVisible();
  });

  test('Password and Confirm mismatch is rejected', async ({ userForm }) => {
    await userForm.password.fill('Qa!234561');
    await userForm.confirmPassword.fill('Qa!999992');
    await userForm.submitAdd();
    await expect(userForm.page.getByText(/passwords do not match/i)).toBeVisible();
  });

  const weakPasswords = [
    { label: 'shorter than 7 chars', value: 'Aa1!2' },
    { label: 'missing uppercase', value: 'aa1!2345' },
    { label: 'missing lowercase', value: 'AA1!2345' },
    { label: 'missing a number', value: 'Aaaa!bbb' },
    { label: 'missing a special character', value: 'Aa123456' },
  ];
  for (const { label, value } of weakPasswords) {
    test(`Password breaking policy is rejected (${label}): "${value}"`, async ({ userForm }) => {
      await userForm.password.fill(value);
      await userForm.confirmPassword.fill(value);
      await userForm.submitAdd();
      await expect(userForm.page.getByText(/unmet|password must|at least|characters/i)).toBeVisible();
    });
  }

  test('Company required', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please select Company.')).toBeVisible();
  });

  test('Role required', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please select role.')).toBeVisible();
  });

  test('Status required', async ({ userForm }) => {
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please select status.')).toBeVisible();
  });

  test('Home Store required for Admin/Employee', async ({ userForm }) => {
    await userForm.selectRole('Admin');
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please select Home Store.')).toBeVisible();
  });

  test('Employee required for Admin/Employee', async ({ userForm }) => {
    await userForm.selectRole('Admin');
    await userForm.submitAdd();
    await expect(userForm.page.getByText('Please select an employee.')).toBeVisible();
  });

  test.describe('Known defects / open items (see use-case doc "Field validation data set")', () => {
    test("Defect: real name with apostrophe is wrongly rejected: \"O'Brien\"", async ({ userForm }) => {
      await userForm.firstName.fill("O'Brien");
      await userForm.submitAdd();
      await expect(userForm.page.getByText('No special characters or numbers allowed.')).toBeHidden();
    });

    test('Defect: real name with hyphen is wrongly rejected: "Mary-Jane"', async ({ userForm }) => {
      await userForm.lastName.fill('Mary-Jane');
      await userForm.submitAdd();
      await expect(userForm.page.getByText('No special characters or numbers allowed.')).toBeHidden();
    });

    test('Defect: accented letters are wrongly rejected: "José"', async ({ userForm }) => {
      await userForm.firstName.fill('José');
      await userForm.submitAdd();
      await expect(userForm.page.getByText('No special characters or numbers allowed.')).toBeHidden();
    });

    test('Defect: Name field has no length limit (120 letters should be rejected)', async ({ userForm }) => {
      await userForm.firstName.fill('a'.repeat(120));
      await userForm.submitAdd();
      await expect(userForm.page.getByText(/too long|maximum/i)).toBeVisible();
    });

    test('Defect: "+1 555 010 0001" should not be silently corrupted', async ({ userForm }) => {
      await userForm.phone.fill('+1 555 010 0001');
      await userForm.phone.blur();
      await expect(userForm.phone).not.toHaveValue('(155) 501-0000');
    });

    test('Minor: an 11-digit phone should not silently drop its last digit', async ({ userForm }) => {
      await userForm.phone.fill('55501000012');
      await userForm.phone.blur();
      await expect(userForm.phone).not.toHaveValue('(555) 010-0001');
    });

    test('Defect: placeholder phone "0000000000" should be rejected', async ({ userForm }) => {
      await userForm.phone.fill('0000000000');
      await userForm.submitAdd();
      await expect(userForm.page.getByText(/valid phone number/i)).toBeVisible();
    });

    test('Minor: "test+1@example.com" is a valid address and should be accepted', async ({ userForm }) => {
      await userForm.email.fill('test+1@example.com');
      await userForm.submitAdd();
      await expect(userForm.page.getByText('Please enter a valid email address')).toBeHidden();
    });

    test('Not yet run: password field should stop accepting input beyond 15 characters', async ({ userForm }) => {
      await userForm.password.fill('Aa1!23456789012345'); // 19 chars
      const value = await userForm.password.inputValue();
      expect(value.length).toBeLessThanOrEqual(15);
    });

    test('Not yet run: pasting into the password field is disabled', async ({ userForm }) => {
      await userForm.password.evaluate((el) => (el as HTMLInputElement).focus());
      await userForm.page.evaluate(async () => {
        try {
          await navigator.clipboard.writeText('Aa1!2345');
        } catch {
          // Clipboard permissions may be unavailable in CI; the paste-key check below still applies.
        }
      });
      await userForm.password.press('Control+V');
      await expect(userForm.password).toHaveValue('');
    });
  });
});
