import { getApps, initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

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

// Firebase初期化関数
function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { auth: null, db: null };
  }

  if (!isFirebaseConfigured) {
    console.warn('Firebase configuration is incomplete. Please check your environment variables.');
    return { auth: null, db: null };
  }

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { auth, db };
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    return { auth: null, db: null };
  }
}

// Firebaseインスタンスを取得
const { auth, db } = initializeFirebase();

export { auth, db };

export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000'}/auth/complete`,
  handleCodeInApp: true,
};
