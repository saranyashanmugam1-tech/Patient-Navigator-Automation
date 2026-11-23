import 'dotenv/config';

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const baseURL = env('BASE_URL', 'https://connect-st-admin.icarebuddy.com');

export interface RoleCredentials {
  companyKey?: string;
  email: string;
  password: string;
}

export type RoleKey = 'sysadmin' | 'appadmin' | 'admin' | 'employee';

export const roleKeys: RoleKey[] = ['sysadmin', 'appadmin', 'admin', 'employee'];

export const credentials: Record<RoleKey, RoleCredentials> = {
  sysadmin: {
    companyKey: env('SYSADMIN_COMPANY_KEY'),
    email: env('SYSADMIN_EMAIL'),
    password: env('SYSADMIN_PASSWORD'),
  },
  appadmin: {
    companyKey: env('APPADMIN_COMPANY_KEY'),
    email: env('APPADMIN_EMAIL'),
    password: env('APPADMIN_PASSWORD'),
  },
  admin: {
    companyKey: env('ADMIN_COMPANY_KEY'),
    email: env('ADMIN_EMAIL'),
    password: env('ADMIN_PASSWORD'),
  },
  employee: {
    companyKey: env('EMPLOYEE_COMPANY_KEY'),
    email: env('EMPLOYEE_EMAIL'),
    password: env('EMPLOYEE_PASSWORD'),
  },
};

export const testData = {
  masterCompany: env('MASTER_COMPANY_NAME', 'Eyefinity Navigator'),
  clientCompany: env('CLIENT_COMPANY_NAME', '937 new company'),
  clientCompany2: env('CLIENT_COMPANY_NAME_2', 'Eyefinity 969'),
  clientCompany3: env('CLIENT_COMPANY_NAME_3', 'QA 0009'),
  clientCompany4: env('CLIENT_COMPANY_NAME_4', '917company'),

  homeStore1: env('HOME_STORE_1', '937-2'),
  homeStore2: env('HOME_STORE_2', '937-29'),
  homeStore3: env('HOME_STORE_3', '937-4'),
  homeStoreDefault: env('HOME_STORE_DEFAULT', 'Default store'),

  existingUserEmail: env('EXISTING_USER_EMAIL'),
  existingSysAdminEmail: env('EXISTING_SYSADMIN_EMAIL'),
};

export const allowDestructiveTests = env('ALLOW_DESTRUCTIVE_TESTS', 'false').toLowerCase() === 'true';

// Display labels used in the Role dropdown. The underlying <option> value for
// AppAdmin is "Application_Admin" per the use-case doc (SA-03); the select
// helpers in UserFormPage fall back to this value if selecting by visible
// label fails.
export const ROLE_VALUE_FALLBACK: Record<string, string> = {
  AppAdmin: 'Application_Admin',
};
