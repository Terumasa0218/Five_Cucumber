'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/providers/I18nProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInAnonymously, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInAnonymously();
      router.push('/home');
    } catch (err) {
      setError(t('error.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      router.push('/home');
    } catch (err) {
      setError(t('error.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">🥒 {t('title.app')}</h1>
            <p className="login-subtitle">{t('title.cucumber5')}</p>
          </div>

          <div className="login-content">
            <p className="login-description">
              {t('tutorial.welcome')}
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="login-actions">
              <button
                className="btn btn--primary btn--large"
                onClick={handleAnonymousLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner" />
                ) : (
                  t('btn.playAsGuest')
                )}
              </button>

              <button
                className="btn btn--large"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t('btn.login')} with Google
                  </>
                )}
              </button>
            </div>

            <div className="login-footer">
              <p className="login-terms">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
