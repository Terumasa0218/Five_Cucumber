import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let dbInternal: Firestore | null = null;

try {
  const hasRequired = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
  if (hasRequired) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    dbInternal = getFirestore(app);
  } else {
    // 環境未設定の場合は null を返す（API側でフォールバック）
    dbInternal = null;
  }
} catch (e) {
  // 初期化失敗時も null（API側でフォールバック）
  dbInternal = null;
}

export const db = dbInternal;


