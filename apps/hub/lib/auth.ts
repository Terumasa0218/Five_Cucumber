'use client';
import { auth, actionCodeSettings, db } from './firebase';
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const PENDING_EMAIL_KEY = 'pendingEmail';
const PENDING_NAME_KEY  = 'pendingName';

export async function sendMagicLink(email: string, displayName?: string) {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  if (displayName) localStorage.setItem(PENDING_NAME_KEY, displayName);
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}
export function isEmailLink(url: string){ return isSignInWithEmailLink(auth, url); }
export async function completeMagicLink(url: string){
  const email = localStorage.getItem(PENDING_EMAIL_KEY) || prompt('メールアドレスを入力してください');
  if (!email) throw new Error('メールアドレスが必要です');
  const cred = await signInWithEmailLink(auth, email, url);
  const name = localStorage.getItem(PENDING_NAME_KEY);
  if (name) {
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
