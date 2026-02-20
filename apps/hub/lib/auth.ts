import { createRequire } from 'node:module';

export type VerifiedAuth = { uid: string };

const require = createRequire(import.meta.url);

let adminAuth: { verifyIdToken(token: string): Promise<{ uid: string }> } | null = null;
let authInitAttempted = false;

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
      const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_JSON;
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
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

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
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
