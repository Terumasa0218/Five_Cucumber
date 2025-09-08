'use client';

import { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async () => {
    // TODO: Implement Firebase Auth sign in
    console.log('Sign in clicked');
  };

  const signOut = async () => {
    // TODO: Implement Firebase Auth sign out
    console.log('Sign out clicked');
    setUser(null);
  };

  const signInAnonymously = async () => {
    // TODO: Implement Firebase Auth anonymous sign in
    console.log('Anonymous sign in clicked');
    // Mock user for now
    setUser({
      uid: 'anonymous-user',
      displayName: 'Guest',
      email: null,
      photoURL: null,
      emailVerified: false,
      isAnonymous: true,
      phoneNumber: null,
      providerId: 'firebase',
      metadata: {} as any,
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
    } as User);
  };

  const signInWithGoogle = async () => {
    // TODO: Implement Firebase Auth Google sign in
    console.log('Google sign in clicked');
    // Mock user for now
    setUser({
      uid: 'google-user',
      displayName: 'Google User',
      email: 'user@example.com',
      photoURL: 'https://via.placeholder.com/40',
      emailVerified: true,
      isAnonymous: false,
      phoneNumber: null,
      providerId: 'google.com',
      metadata: {} as any,
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
    } as User);
  };

  useEffect(() => {
    // TODO: Initialize Firebase Auth listener
    setLoading(false);
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signInAnonymously,
    signInWithGoogle,
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