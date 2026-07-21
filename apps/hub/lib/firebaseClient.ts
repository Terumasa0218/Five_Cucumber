'use client';

import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export type FirebaseClientConfigStatus = {
  hasApiKey: boolean;
  hasAuthDomain: boolean;
  hasProjectId: boolean;
  hasAppId: boolean;
  missingKeys: string[];
};

export function getFirebaseClientConfigStatus(): FirebaseClientConfigStatus {
  const entries = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
  ] as const;

  return {
    hasApiKey: Boolean(firebaseConfig.apiKey),
    hasAuthDomain: Boolean(firebaseConfig.authDomain),
    hasProjectId: Boolean(firebaseConfig.projectId),
    hasAppId: Boolean(firebaseConfig.appId),
    missingKeys: entries.filter(([, value]) => !value).map(([key]) => key),
  };
}

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);


