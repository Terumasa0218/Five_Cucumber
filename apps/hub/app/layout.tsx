import type { Metadata } from 'next';
import Header from "../components/Header";
import Script from 'next/script';
import { cookies, headers } from 'next/headers';
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://five-cucumber-hub.vercel.app'),
  title: {
    default: 'Five Cucumber – 5本のきゅうり',
    template: '%s | Five Cucumber'
  },
  description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。CPU対戦、フレンド対戦に対応。',
  applicationName: 'Five Cucumber',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'Five Cucumber – 5本のきゅうり',
    description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。',
    siteName: 'Five Cucumber',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Five Cucumber – 5本のきゅうり'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Five Cucumber – 5本のきゅうり',
    description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。',
    images: ['/og-image.png']
  }
};

const COMMIT = (process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev').slice(0, 8);
const BUILD_TIME = new Date().toISOString().replace(/\..+$/, 'Z');
const RUNTIME = 'nodejs';

function resolveLocale(): 'ja' | 'en' {
  const languageFromCookie = cookies().get('language')?.value;
  if (languageFromCookie === 'ja' || languageFromCookie === 'en') {
    return languageFromCookie;
  }

  const acceptLanguage = headers().get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.startsWith('en')) {
    return 'en';
  }

  return 'ja';
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale();
  const pathname = headers().get('x-pathname') || '';
  const isHome = pathname.startsWith('/home');

  return (
    <html lang={locale} data-theme="light">
      <body data-page={isHome ? 'home' : ''}>
        <Script id="suppress-extension-noise" strategy="beforeInteractive">
          {`
            (function(){
              if (typeof window==='undefined') return;
              function muteMessage(msg){
                return msg && String(msg).indexOf('The message port closed before a response was received') !== -1;
              }
              window.addEventListener('unhandledrejection', function(e){
                var msg = e && e.reason && (e.reason.message || e.reason);
                if (muteMessage(msg)) { e.preventDefault(); return false; }
              });
              window.addEventListener('error', function(e){
                var msg = e && (e.message || (e.error && e.error.message));
                if (muteMessage(msg)) { e.preventDefault(); return false; }
              }, true);
            })();
          `}
        </Script>
        <Script id="build-badge-ping" strategy="afterInteractive">
          {`
            (function(){
              function isPlayingPath(){
                var path = window.location.pathname || '';
                return path.indexOf('/play') !== -1;
              }
              function tryReloadIfAllowed(){
                var pendingReload = sessionStorage.getItem('fc_reload_pending') === '1';
                if (!pendingReload || isPlayingPath()) return;
                if (!sessionStorage.getItem('fc_reload_once')) {
                  sessionStorage.setItem('fc_reload_once','1');
                  sessionStorage.removeItem('fc_reload_pending');
                  location.reload();
                }
              }
              try {
                fetch('/api/ping', { cache: 'no-store' }).then(function(r){
                  var xb = r.headers.get('x-build');
                  var badge = document.querySelector('[data-build-badge]');
                  if (badge) badge.setAttribute('data-build-x', xb||'');
                  var built='${COMMIT}';
                  if (xb && xb !== built) {
                    if (isPlayingPath()) {
                      sessionStorage.setItem('fc_reload_pending', '1');
                    } else {
                      tryReloadIfAllowed();
                    }
                  }
                }).catch(function(err){ console.warn('[BuildCheck] ping failed', err); });
                setInterval(tryReloadIfAllowed, 1000);
              } catch(e){ console.warn('[BuildCheck] error', e); }
            })();
          `}
        </Script>
        {/* 浮遊ナビ（背景の空白域に左右配置） */}
        <Header />
        {children}
        {/* BUILD バッジ（右下） */}
        <div
          data-build-badge
          style={{
            position: 'fixed',
            right: 8,
            bottom: 8,
            fontSize: 11,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 6,
            pointerEvents: 'none',
            opacity: 0.7,
            zIndex: 2147483647
          }}
          aria-label="BUILD info"
        >
          {`BUILD ${COMMIT} · ${BUILD_TIME} · ${RUNTIME}`}
        </div>
      </body>
    </html>
  );
}
