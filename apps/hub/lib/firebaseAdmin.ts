import type { App } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null | undefined;

function createAdminApp(): App | null {
  if (typeof window !== 'undefined') {
    return null;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  try {
    const existing = getApps().find(app => app.name === 'five-cucumber-admin');
    if (existing) {
      return existing;
    }

    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    }, 'five-cucumber-admin');
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
