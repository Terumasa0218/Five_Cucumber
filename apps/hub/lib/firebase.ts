import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// クライアントサイドでのみFirebaseを初期化
let app: any = null;
let auth: any = null;
let db: any = null;

// Firebase設定の検証
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 環境変数が設定されているかチェック
const isFirebaseConfigured = firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId && 
  firebaseConfig.appId;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    // エラー時はnullのままにする
    auth = null;
    db = null;
  }
} else if (typeof window !== 'undefined') {
  console.warn('Firebase configuration is incomplete. Please check your environment variables.');
  // 設定が不完全な場合はnullのままにする
  auth = null;
  db = null;
}

export { auth, db };

export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000'}/auth/complete`,
  handleCodeInApp: true,
};
