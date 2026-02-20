import { auth } from '@/lib/firebaseClient';
import { signInAnonymously } from 'firebase/auth';

export async function getClientAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }

  const credential = await signInAnonymously(auth);
  return credential.user.getIdToken();
}


export async function getClientAuthUid(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}
