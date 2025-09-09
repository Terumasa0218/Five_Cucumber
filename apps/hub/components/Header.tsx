'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/providers/I18nProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Header() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/home', label: t('title.home') },
    { href: '/settings', label: t('title.settings') }
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-brand">
            <Link href="/home" className="brand-link">
              <span className="brand-text">Game Hub</span>
            </Link>
          </div>

          <nav className="header-nav">
            <ul className="nav-list">
              {navItems.map(item => (
                <li key={item.href} className="nav-item">
                  <Link
                    href={item.href}
                    className={`nav-link ${isActive(item.href) ? 'nav-link--active' : ''}`}
                  >
                    <span className="nav-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            {user ? (
              <div className="user-info">
                <span className="user-name">
                  {user.displayName || 'Guest'}
                </span>
              </div>
            ) : (
              <Link href="/auth/login" className="login-link">
                ログイン
              </Link>
            )}

            <button
              className="header-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="menu-icon">≡</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="header-mobile-menu">
            <nav className="mobile-nav">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-nav-link ${isActive(item.href) ? 'mobile-nav-link--active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mobile-nav-label">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
