'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { PresenceBadge } from '@/components/PresenceBadge';

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({
    language: 'ja',
    theme: 'light',
    sound: true,
    animations: true,
    reducedMotion: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load from localStorage
    const saved = localStorage.getItem('game-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('game-settings', JSON.stringify(settings));
      
      // Apply language change
      if (settings.language !== i18n.language) {
        await i18n.changeLanguage(settings.language);
      }
      
      // Apply theme change
      document.documentElement.setAttribute('data-theme', settings.theme);
      
      // TODO: Show success toast
      console.log('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-page">
      <div className="container">
        <div className="settings-header">
          <h1>{t('title.settings')}</h1>
          <PresenceBadge />
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h2>Appearance</h2>
            
            <div className="setting-group">
              <label htmlFor="language" className="setting-label">
                {t('settings.language')}
              </label>
              <select
                id="language"
                className="input"
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="setting-group">
              <label htmlFor="theme" className="setting-label">
                {t('settings.theme')}
              </label>
              <select
                id="theme"
                className="input"
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">{t('settings.theme.light')}</option>
                <option value="dark">{t('settings.theme.dark')}</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h2>Audio & Visual</h2>
            
            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => handleSettingChange('sound', e.target.checked)}
                />
                <span className="checkbox-label">{t('settings.sound')}</span>
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => handleSettingChange('animations', e.target.checked)}
                />
                <span className="checkbox-label">{t('settings.animations')}</span>
              </label>
            </div>

            <div className="setting-group">
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                />
                <span className="checkbox-label">{t('settings.reducedMotion')}</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h2>Account</h2>
            
            <div className="account-info">
              <div className="account-item">
                <span className="account-label">User ID:</span>
                <span className="account-value">{user?.uid || 'Guest'}</span>
              </div>
              <div className="account-item">
                <span className="account-label">Display Name:</span>
                <span className="account-value">{user?.displayName || 'Guest'}</span>
              </div>
              <div className="account-item">
                <span className="account-label">Email:</span>
                <span className="account-value">{user?.email || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button
              className="btn btn--primary btn--large"
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="loading-spinner" />
              ) : (
                t('toast.settingsSaved')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
