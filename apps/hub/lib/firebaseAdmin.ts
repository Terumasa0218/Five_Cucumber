import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let adminApp: App | null = null;
let adminDb: Firestore | null | undefined;

function normalizePrivateKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  const replaced = trimmed.replace(/\\n/g, '\n');
  return replaced;
}

function decodeBase64(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch (error) {
    console.warn('[firebaseAdmin] Failed to decode base64 credential:', error);
    return null;
  }
}

function parseServiceAccount(json: string | null | undefined): ServiceAccount | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const projectId = (parsed.project_id ?? parsed.projectId) as string | undefined;
    const clientEmail = (parsed.client_email ?? parsed.clientEmail) as string | undefined;
    const privateKeyRaw = (parsed.private_key ?? parsed.privateKey) as string | undefined;

    if (!projectId || !clientEmail || !privateKeyRaw) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKeyRaw),
    };
  } catch (error) {
    console.warn('[firebaseAdmin] Failed to parse service account JSON:', error);
    return null;
  }
}

function readServiceAccountFromEnv(): ServiceAccount | null {
  if (typeof window !== 'undefined') {
    return null;
  }

  const base64JsonKeys = [
    'FIREBASE_ADMIN_CREDENTIAL_BASE64',
    'FIREBASE_ADMIN_CREDENTIALS_BASE64',
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64',
  ] as const;

  for (const key of base64JsonKeys) {
    const decoded = decodeBase64(process.env[key]);
    const parsed = parseServiceAccount(decoded ?? undefined);
    if (parsed) {
      return parsed;
    }
  }

  const jsonKeys = [
    'FIREBASE_ADMIN_CREDENTIAL',
    'FIREBASE_ADMIN_CREDENTIALS',
    'FIREBASE_ADMIN_SERVICE_ACCOUNT',
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON',
  ] as const;

  for (const key of jsonKeys) {
    const parsed = parseServiceAccount(process.env[key]);
    if (parsed) {
      return parsed;
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail) {
    return null;
  }

  const decodedPrivateKey = decodeBase64(privateKeyBase64);
  const privateKey = decodedPrivateKey
    ? normalizePrivateKey(decodedPrivateKey)
    : privateKeyRaw
      ? normalizePrivateKey(privateKeyRaw)
      : null;

  if (!privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

function createAdminApp(): App | null {
  const serviceAccount = readServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  try {
    const existing = getApps().find((app) => app.name === 'five-cucumber-admin');
    if (existing) {
      return existing;
    }

    return initializeApp(
      {
        credential: cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        }),
      },
      'five-cucumber-admin',
    );
  } catch (error) {
    console.warn('[firebaseAdmin] initialize failed:', error);
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  if (adminDb !== undefined) {
    return adminDb;
  }

  try {
    adminApp = createAdminApp();
    adminDb = adminApp ? getFirestore(adminApp) : null;
  } catch (error) {
    console.warn('[firebaseAdmin] getFirestore failed:', error);
    adminDb = null;
  }

  return adminDb;
}
