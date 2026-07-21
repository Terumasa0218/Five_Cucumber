import { auth, getFirebaseClientConfigStatus } from '@/lib/firebaseClient';
import { signInAnonymously } from 'firebase/auth';

export type ClientAuthFailureReason = 'missing-client-config' | 'anonymous-sign-in-failed';

export type ClientAuthFailureDetail = {
  reason: ClientAuthFailureReason;
  code?: string;
  message?: string;
  firebaseClient: ReturnType<typeof getFirebaseClientConfigStatus>;
};

export class ClientAuthError extends Error {
  constructor(public readonly detail: ClientAuthFailureDetail) {
    super(detail.message ?? detail.reason);
    this.name = 'ClientAuthError';
  }
}

function getFirebaseErrorInfo(error: unknown): { code?: string; message?: string } {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  return {
    code: typeof record.code === 'string' ? record.code : undefined,
    message: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined,
  };
}

function assertClientConfig(): void {
  const firebaseClient = getFirebaseClientConfigStatus();
  if (firebaseClient.missingKeys.length > 0) {
    throw new ClientAuthError({
      reason: 'missing-client-config',
      message: `Missing Firebase client config: ${firebaseClient.missingKeys.join(', ')}`,
      firebaseClient,
    });
  }
}

async function signInAndGetUser() {
  assertClientConfig();
  try {
    return (await signInAnonymously(auth)).user;
  } catch (error) {
    const info = getFirebaseErrorInfo(error);
    throw new ClientAuthError({
      reason: 'anonymous-sign-in-failed',
      code: info.code,
      message: info.message,
      firebaseClient: getFirebaseClientConfigStatus(),
    });
  }
}

export async function getClientAuthToken(): Promise<string | null> {
  assertClientConfig();
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }

  const user = await signInAndGetUser();
  return user.getIdToken();
}


export async function getClientAuthUid(): Promise<string> {
  assertClientConfig();
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const user = await signInAndGetUser();
  return user.uid;
}
