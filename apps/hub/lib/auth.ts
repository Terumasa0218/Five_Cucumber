import { createRequire } from 'node:module';

export type VerifiedAuth = { uid: string };
export type AuthFailureReason = 'missing-token' | 'server-auth-unavailable' | 'token-invalid';

export type AuthFailureDetail = {
  reason: AuthFailureReason;
  hasBearerToken: boolean;
  firebaseAdmin: ReturnType<typeof getFirebaseAdminEnvStatus>;
};

export type AuthCheckResult =
  | { ok: true; auth: VerifiedAuth }
  | { ok: false; detail: AuthFailureDetail };

const require = createRequire(import.meta.url);

let adminAuth: { verifyIdToken(token: string): Promise<{ uid: string }> } | null = null;
let authInitAttempted = false;

function getFirebaseServiceAccountJson(): string | undefined {
  return process.env.FIREBASE_ADMIN_SDK_JSON ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
}

function getFirebaseAdminProjectId(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

function getFirebaseAdminClientEmail(): string | undefined {
  return process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
}

function getFirebaseAdminPrivateKey(): string | undefined {
  return process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY;
}

export function getFirebaseAdminEnvStatus() {
  const hasServiceAccountJson = Boolean(getFirebaseServiceAccountJson());
  const hasProjectId = Boolean(getFirebaseAdminProjectId());
  const hasClientEmail = Boolean(getFirebaseAdminClientEmail());
  const hasPrivateKey = Boolean(getFirebaseAdminPrivateKey());

  return {
    hasServiceAccountJson,
    hasProjectId,
    hasClientEmail,
    hasPrivateKey,
    hasUsableCredentials: hasServiceAccountJson || (hasProjectId && hasClientEmail && hasPrivateKey),
  };
}

function getAdminAuth(): { verifyIdToken(token: string): Promise<{ uid: string }> } | null {
  if (adminAuth) return adminAuth;
  if (authInitAttempted) return null;
  authInitAttempted = true;

  try {
    const appMod = require('firebase-admin/app') as {
      initializeApp: (options?: unknown) => unknown;
      cert: (serviceAccount: { projectId: string; clientEmail: string; privateKey: string }) => unknown;
      getApps: () => unknown[];
      getApp: () => unknown;
    };
    const authMod = require('firebase-admin/auth') as {
      getAuth: (app?: unknown) => { verifyIdToken(token: string): Promise<{ uid: string }> };
    };

    let app: unknown;
    if (appMod.getApps().length > 0) {
      app = appMod.getApp();
    } else {
      const serviceAccountJson = getFirebaseServiceAccountJson();
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson) as {
          project_id: string;
          client_email: string;
          private_key: string;
        };
        app = appMod.initializeApp({
          credential: appMod.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        const projectId = getFirebaseAdminProjectId();
        const clientEmail = getFirebaseAdminClientEmail();
        const privateKey = getFirebaseAdminPrivateKey();

        if (projectId && clientEmail && privateKey) {
          app = appMod.initializeApp({
            credential: appMod.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        } else {
          app = appMod.initializeApp();
        }
      }
    }

    adminAuth = authMod.getAuth(app);
    return adminAuth;
  } catch {
    return null;
  }
}

export async function verifyAuth(request: Request): Promise<VerifiedAuth | null> {
  const result = await verifyAuthDetailed(request);
  return result.ok ? result.auth : null;
}

export async function verifyAuthDetailed(request: Request): Promise<AuthCheckResult> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      detail: {
        reason: 'missing-token',
        hasBearerToken: false,
        firebaseAdmin: getFirebaseAdminEnvStatus(),
      },
    };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return {
      ok: false,
      detail: {
        reason: 'missing-token',
        hasBearerToken: false,
        firebaseAdmin: getFirebaseAdminEnvStatus(),
      },
    };
  }

  const auth = getAdminAuth();
  if (!auth) {
    return {
      ok: false,
      detail: {
        reason: 'server-auth-unavailable',
        hasBearerToken: true,
        firebaseAdmin: getFirebaseAdminEnvStatus(),
      },
    };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return { ok: true, auth: { uid: decoded.uid } };
  } catch {
    const firebaseAdmin = getFirebaseAdminEnvStatus();
    return {
      ok: false,
      detail: {
        reason: firebaseAdmin.hasUsableCredentials ? 'token-invalid' : 'server-auth-unavailable',
        hasBearerToken: true,
        firebaseAdmin,
      },
    };
  }
}

export function getAuthFailureStatus(reason: AuthFailureReason): number {
  return reason === 'server-auth-unavailable' ? 503 : 401;
}

export function getAuthFailureBody(detail: AuthFailureDetail) {
  return {
    ok: false,
    reason: detail.reason,
    detail: {
      hasBearerToken: detail.hasBearerToken,
      firebaseAdmin: detail.firebaseAdmin,
    },
  };
}
