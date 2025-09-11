'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { useEffect } from 'react';

interface UseRequireNicknameOptions {
  mode: 'auto' | 'require';
}

export function useRequireNickname({ mode }: UseRequireNicknameOptions) {
  const { open, profile } = useProfile();

  useEffect(() => {
    // プロフィールが未設定の場合
    if (!profile?.nickname || profile.nickname.trim() === '' || profile.nickname.length > 8) {
      open();
    }
  }, [profile, open]);

  // フックはモーダルを開くだけ。リダイレクトはしない。
  return {};
}
