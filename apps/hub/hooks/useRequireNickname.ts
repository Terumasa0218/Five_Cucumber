'use client';

import { getProfile } from '@/lib/profile';
import { useEffect, useState } from 'react';

export function useRequireNickname() {
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(getProfile());

  useEffect(() => {
    // プロフィールが未設定の場合はモーダルを表示
    if (!profile?.nickname) {
      setShowModal(true);
    }
  }, [profile]);

  const handleProfileSaved = (newProfile: { nickname: string; avatarId?: string }) => {
    setProfile(newProfile);
    setShowModal(false);
  };

  return {
    showModal,
    setShowModal,
    profile,
    handleProfileSaved
  };
}
