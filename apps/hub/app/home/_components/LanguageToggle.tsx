'use client';

import { useI18n } from '@/hooks/useI18n';
import styles from './DesktopHero.module.css';

type Props = { className?: string };

export default function LanguageToggle({ className }: Props) {
  const { language, changeLanguage } = useI18n();
  return (
    <button
      type="button"
      className={className ?? styles.linkMinor}
      onClick={() => changeLanguage(language === 'ja' ? 'en' : 'ja')}
      aria-label="言語を切り替える"
    >
      🌐 言語切替
    </button>
  );
}


