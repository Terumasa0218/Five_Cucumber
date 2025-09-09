import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const app = getApps().length ? getApps()[0] : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000'}/auth/complete`,
  handleCodeInApp: true,
};
