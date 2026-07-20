import { afterEach, describe, expect, it } from 'vitest';
import { getFirebaseAdminEnvStatus } from '../auth';

const ORIGINAL_ENV = { ...process.env };

function resetFirebaseAdminEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.FIREBASE_ADMIN_SDK_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_ADMIN_PROJECT_ID;
  delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

describe('Firebase Admin environment detection', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('accepts the documented Firebase Admin variable names', () => {
    resetFirebaseAdminEnv();
    process.env.FIREBASE_PROJECT_ID = 'five-cucumber';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@example.test';
    process.env.FIREBASE_PRIVATE_KEY = 'private-key';

    expect(getFirebaseAdminEnvStatus()).toEqual({
      hasServiceAccountJson: false,
      hasProjectId: true,
      hasClientEmail: true,
      hasPrivateKey: true,
      hasUsableCredentials: true,
    });
  });

  it('accepts the FIREBASE_ADMIN_* aliases', () => {
    resetFirebaseAdminEnv();
    process.env.FIREBASE_ADMIN_PROJECT_ID = 'five-cucumber';
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'firebase-adminsdk@example.test';
    process.env.FIREBASE_ADMIN_PRIVATE_KEY = 'private-key';

    expect(getFirebaseAdminEnvStatus()).toEqual({
      hasServiceAccountJson: false,
      hasProjectId: true,
      hasClientEmail: true,
      hasPrivateKey: true,
      hasUsableCredentials: true,
    });
  });

  it('accepts a service-account JSON blob', () => {
    resetFirebaseAdminEnv();
    process.env.FIREBASE_ADMIN_SDK_JSON = '{"project_id":"five-cucumber"}';

    expect(getFirebaseAdminEnvStatus()).toMatchObject({
      hasServiceAccountJson: true,
      hasUsableCredentials: true,
    });
  });
});
