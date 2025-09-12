// 多言語対応のフック

import { getCurrentLanguage, setLanguage, t, type Language, type Translations } from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function useI18n() {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage);
  const [translations, setTranslations] = useState<Translations>(() => {
    const { getTranslations } = require('@/lib/i18n');
    return getTranslations(getCurrentLanguage());
  });

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLanguageState(newLang);
    
    const { getTranslations } = require('@/lib/i18n');
    setTranslations(getTranslations(newLang));
  };

  const translate = (key: keyof Translations, params?: Record<string, string>) => {
    return t(key, language, params);
  };

  useEffect(() => {
    // ストレージ変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as Language;
        if (['ja', 'en'].includes(newLang)) {
          setLanguageState(newLang);
          const { getTranslations } = require('@/lib/i18n');
          setTranslations(getTranslations(newLang));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    language,
    translations,
    changeLanguage,
    t: translate
  };
}
