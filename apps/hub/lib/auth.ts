'use client';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { actionCodeSettings, getFirebaseClient } from './firebase';
const PENDING_EMAIL_KEY = 'pendingEmail';
const PENDING_NAME_KEY  = 'pendingName';

export async function sendMagicLink(email: string, displayName?: string) {
  if (typeof window === 'undefined') {
    throw new Error('認証機能はクライアントサイドでのみ利用可能です');
  }
  const fb = getFirebaseClient();
  if (!fb) {
    throw new Error('Firebase認証が利用できません');
  }
  await sendSignInLinkToEmail(fb.auth, email, actionCodeSettings);
  if (displayName) localStorage.setItem(PENDING_NAME_KEY, displayName);
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}
export function isEmailLink(url: string){ 
  if (typeof window === 'undefined') {
    return false;
  }
  const fb = getFirebaseClient();
  if (!fb) {
    return false;
  }
  return isSignInWithEmailLink(fb.auth, url); 
}
export async function completeMagicLink(url: string){
  if (typeof window === 'undefined') {
    throw new Error('認証機能はクライアントサイドでのみ利用可能です');
  }
  const fb = getFirebaseClient();
  if (!fb) {
    throw new Error('Firebase認証が利用できません');
  }
  const email = localStorage.getItem(PENDING_EMAIL_KEY) || prompt('メールアドレスを入力してください');
  if (!email) throw new Error('メールアドレスが必要です');
  const cred = await signInWithEmailLink(fb.auth, email, url);
  const name = localStorage.getItem(PENDING_NAME_KEY);
  if (name) {
    const unameRef = doc(fb.db, 'usernames', name);
    const snap = await getDoc(unameRef);
    if (!snap.exists()) {
      await setDoc(unameRef, { uid: cred.user.uid, at: Date.now() });
      await setDoc(doc(fb.db, 'profiles', cred.user.uid), { displayName: name, at: Date.now() });
    }
    localStorage.removeItem(PENDING_NAME_KEY);
  }
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return cred.user;
}
