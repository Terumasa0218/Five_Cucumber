import { ApiClientAuthError } from '@/lib/api';

type AuthFailurePayload = {
  reason?: string;
  detail?: unknown;
  error?: string;
};

type AuthFailureDetail = {
  hasBearerToken?: boolean;
  firebaseAdmin?: {
    hasServiceAccountJson?: boolean;
    hasProjectId?: boolean;
    hasClientEmail?: boolean;
    hasPrivateKey?: boolean;
    hasUsableCredentials?: boolean;
  };
};

function getAuthDetail(detail: unknown): AuthFailureDetail {
  return detail && typeof detail === 'object' ? (detail as AuthFailureDetail) : {};
}

export function friendAuthFailureMessage(status: number, payload?: AuthFailurePayload): string | null {
  const reason = payload?.reason;
  const detail = getAuthDetail(payload?.detail);

  if (reason === 'missing-token') {
    return 'ブラウザ側のFirebase匿名認証トークンを取得できていません。Firebase Client設定、Anonymous認証、承認済みドメインを確認してください。';
  }

  if (reason === 'server-auth-unavailable') {
    const missing = detail.firebaseAdmin?.hasUsableCredentials === false;
    return missing
      ? 'VercelのFirebase Admin設定が不足しています。FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY を設定して再デプロイしてください。'
      : 'サーバー側のFirebase Admin認証を初期化できていません。Firebase Admin設定を確認してください。';
  }

  if (reason === 'token-invalid') {
    return 'Firebase認証トークンの検証に失敗しました。Firebase Client設定とFirebase Admin設定が同じプロジェクトを向いているか確認してください。';
  }

  if (status === 401 || status === 503) {
    return 'フレンド対戦の認証設定を確認してください。Firebase Client / Firebase Admin のどちらかが不足している可能性があります。';
  }

  return null;
}

export function friendClientAuthFailureMessage(error: unknown): string | null {
  if (!(error instanceof ApiClientAuthError)) return null;

  const code = error.failure.code;
  const detail = error.failure.detail as
    | {
        reason?: string;
        firebaseClient?: {
          missingKeys?: string[];
        };
      }
    | undefined;
  const missingKeys = detail?.firebaseClient?.missingKeys ?? [];

  if (detail?.reason === 'missing-client-config' || missingKeys.length > 0) {
    return `VercelのFirebase Client設定が不足しています。${missingKeys.join(' / ')} を設定して再デプロイしてください。`;
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Authentication の Anonymous 認証が無効です。Firebase Consoleで「匿名」を有効にしてください。';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Firebase Authentication の承認済みドメインに five-cucumber-hub.vercel.app が登録されていません。Firebase Consoleで追加してください。';
  }

  if (code === 'auth/invalid-api-key') {
    return 'Firebase Client の API key が正しくありません。Vercelの NEXT_PUBLIC_FIREBASE_API_KEY を確認してください。';
  }

  const suffix = code ? ` (${code})` : error.failure.message ? ` (${error.failure.message})` : '';
  return `ブラウザ側のFirebase匿名ログインに失敗しました${suffix}`;
}
