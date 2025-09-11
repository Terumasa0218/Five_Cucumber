import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// NEXT_PUBLIC_* のみ使用（Vercelのクライアントから参照可能）
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

const required: (keyof typeof process.env)[] = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

// 不足しているキー（未設定でもビルドは通す）
const missing = required.filter(k => !process.env[k]);
export const firebaseEnvOk = missing.length === 0;

export function getFirebaseClient():
  | { app: FirebaseApp; auth: Auth; db: Firestore }
  | null {
  // SSRでは初期化しない
  if (typeof window === 'undefined') return null;
  if (!firebaseEnvOk) {
    // Firebase設定が不完全な場合は警告を出さずにnullを返す
    return null;
  }
  const app = getApps().length ? getApp() : initializeApp(cfg);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

// 型を再エクスポート（便利用）
export type { Auth, FirebaseApp, Firestore };

export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000'}/auth/complete`,
  handleCodeInApp: true,
};
