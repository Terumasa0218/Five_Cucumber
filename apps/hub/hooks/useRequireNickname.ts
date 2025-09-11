'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { useEffect } from 'react';

interface UseRequireNicknameOptions {
  mode: 'auto' | 'require';
}

export function useRequireNickname({ mode }: UseRequireNicknameOptions) {
  const { isOpen, open, close, profile } = useProfile();

  useEffect(() => {
    // プロフィールが未設定の場合
    if (!profile?.nickname || profile.nickname.trim() === '' || profile.nickname.length > 8) {
      open();
    }
  }, [profile, open]);

  const handleProfileSaved = () => {
    close();
  };

  return {
    isOpen,
    close,
    profile,
    handleProfileSaved
  };
}
