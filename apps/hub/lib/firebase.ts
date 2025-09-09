import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// クライアントサイドでのみFirebaseを初期化
let app: any = null;
let auth: any = null;
let database: any = null;
let db: any = null;
let firestore: any = null;
let analytics: any = null;

if (typeof window !== 'undefined') {
  // クライアントサイドでのみ実行
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  db = getFirestore(app);
  firestore = getFirestore(app);
  analytics = getAnalytics(app);
}

export { auth, database, db, firestore, analytics };

// メールリンク設定（本番ドメイン/ローカル双方対応）
export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000'}/auth/complete`,
  handleCodeInApp: true,
};

export default app;
