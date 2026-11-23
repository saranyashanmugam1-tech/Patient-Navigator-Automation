/** Builds a unique test-user email: auto.<role>.<timestamp>@example.com (per the use-case doc's email pattern). */
export function uniqueEmail(role: string): string {
  return `auto.${role.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Date.now()}@example.com`;
}

/** A password satisfying the documented policy: 7-15 chars, upper, lower, number, special. */
export function validPassword(): string {
  const suffix = Date.now().toString().slice(-6);
  return `Qa!${suffix}`.slice(0, 15);
}

export const validUser = {
  firstName: 'Claude',
  lastName: 'Tester',
  phone: '5550100001',
  phoneFormatted: '(555) 010-0001',
};

/** The field validation data set from the use-case doc (SA-10 / AA-10 / AD-10). */
export const invalidFieldData = {
  nameSpecialOrNumbers: ['John1', 'J@hn', 'Smith2', 'Smith!'],
  nameAccepted: ['John Paul', 'J', 'Van Der Berg'],
  emailInvalid: [
    'abc',
    'abc@',
    'abc@x',
    '@example.com',
    'a b@example.com',
    'test@example.c',
    'test@@example.com',
    'test@example..com',
  ],
  emailAccepted: ['test@example.com', 'test.name@sub.example.co.in', 'TEST@EXAMPLE.COM'],
  phoneAccepted: ['5550100001', '555-010-0001', '(555) 010-0001'],
};
