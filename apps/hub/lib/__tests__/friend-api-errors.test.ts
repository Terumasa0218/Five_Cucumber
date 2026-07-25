import { describe, expect, it } from 'vitest';
import { ApiClientAuthError } from '../api';
import { friendAuthFailureMessage, friendClientAuthFailureMessage } from '../friendApiErrors';

function authError(code?: string, detail?: unknown) {
  return new ApiClientAuthError(
    '[API POST /api/friend/create] Firebase client authentication failed',
    {
      reason: 'missing-client-token',
      code,
      detail,
    },
    'POST',
    '/api/friend/create',
  );
}

describe('friend client auth failure messages', () => {
  it('explains disabled anonymous Firebase auth', () => {
    expect(friendClientAuthFailureMessage(authError('auth/operation-not-allowed'))).toContain(
      'Anonymous 認証が無効',
    );
  });

  it('explains unauthorized Firebase domains', () => {
    expect(friendClientAuthFailureMessage(authError('auth/unauthorized-domain'))).toContain(
      '承認済みドメイン',
    );
  });

  it('lists missing Firebase client config keys', () => {
    const message = friendClientAuthFailureMessage(
      authError(undefined, {
        reason: 'missing-client-config',
        firebaseClient: {
          missingKeys: ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
        },
      }),
    );

    expect(message).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(message).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  });
});

describe('friend server failure messages', () => {
  it('explains missing shared store config', () => {
    expect(friendAuthFailureMessage(503, { reason: 'no-shared-store' })).toContain(
      '共有ストア設定が不足',
    );
  });

  it('explains shared store connection failures', () => {
    expect(friendAuthFailureMessage(503, { reason: 'kv-failed' })).toContain(
      '共有ストアへ接続できません',
    );
  });
});
