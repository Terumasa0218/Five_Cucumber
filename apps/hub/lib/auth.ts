// apps/hub/lib/auth.ts
'use client';
import { auth, actionCodeSettings, db } from '../lib/firebase';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PENDING_EMAIL_KEY = 'pendingEmail';
const PENDING_NAME_KEY  = 'pendingName';

export async function sendMagicLink(email: string, displayName?: string) {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  if (displayName) localStorage.setItem(PENDING_NAME_KEY, displayName);
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}

export async function completeMagicLink(currentUrl: string) {
  const email = localStorage.getItem(PENDING_EMAIL_KEY) || prompt('メールアドレスを入力してください');
  if (!email) throw new Error('メールアドレスが必要です');
  const cred = await signInWithEmailLink(auth, email, currentUrl);

  // 新規作成時のみ displayName を保存（あれば）
  const name = localStorage.getItem(PENDING_NAME_KEY);
  if (name) {
    // ユーザー名の簡易ユニークチェック（衝突時は末尾に数字付与; 本番はCFで排他）
    const unameRef = doc(db, 'usernames', name);
    const snap = await getDoc(unameRef);
    if (!snap.exists()) {
      await setDoc(unameRef, { uid: cred.user.uid, at: Date.now() });
      await setDoc(doc(db, 'profiles', cred.user.uid), { displayName: name, at: Date.now() });
    }
    localStorage.removeItem(PENDING_NAME_KEY);
  }
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return cred.user;
}

export function isEmailLink(url: string) {
  return isSignInWithEmailLink(auth, url);
}
