'use client';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signinGuest: () => Promise<void>;
  signout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only initialize auth on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Check if auth is available
    if (!auth) {
      console.warn('Firebase auth is not available - check your environment variables');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.warn('Firebase auth initialization failed:', error);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const signinGuest = async () => {
    if (typeof window === 'undefined' || !auth) {
      console.warn('Firebase auth is not available');
      return;
    }
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Guest sign-in failed:', error);
    }
  };

  const signout = async () => {
    if (typeof window === 'undefined' || !auth) {
      console.warn('Firebase auth is not available');
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  const value = {
    user,
    loading,
    isGuest: user?.isAnonymous === true,
    signinGuest,
    signout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}