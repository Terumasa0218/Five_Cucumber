'use client';

import { getProfile } from '@/lib/profile';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface Profile {
  nickname: string;
  avatarId?: string;
}

interface ProfileContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  profile: Profile | null;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);

  const refreshProfile = () => {
    const currentProfile = getProfile();
    setProfileState(currentProfile);
  };

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    refreshProfile(); // プロフィール更新を反映
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // デバッグ機能: ?forceProfile=1 でモーダル強制表示
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('forceProfile') === '1') {
      open();
    }
  }, []);

  // デバッグ機能: window.resetProfile() をグローバルに公開
  useEffect(() => {
    (window as any).resetProfile = () => {
      localStorage.removeItem('playerProfile');
      document.cookie = 'guestId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      refreshProfile();
    };
  }, []);

  return (
    <ProfileContext.Provider value={{
      isOpen,
      open,
      close,
      profile,
      refreshProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
