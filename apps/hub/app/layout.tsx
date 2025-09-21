import type { Metadata } from 'next';
import Header from "../components/Header";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="light">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                if (typeof window==='undefined') return;
                window.addEventListener('unhandledrejection', function(e){
                  var msg = String(e && e.reason && e.reason.message || e && e.reason || e);
                  if (msg && msg.indexOf('The message port closed before a response was received') !== -1) {
                    e.preventDefault();
                    return false;
                  }
                });
                // TEST: ping build header and auto-reload once if mismatched
                try {
                  fetch('/api/ping', { cache: 'no-store' }).then(async (r)=>{
                    const xb = r.headers.get('x-build');
                    console.info('[BuildCheck] x-build:', xb);
                    const badge = document.querySelector('[data-build-badge]');
                    if (badge) badge.setAttribute('data-build-x', xb||'');
                    var built = '${COMMIT}';
                    if (xb && xb !== built && !sessionStorage.getItem('fc_reload_once')) {
                      sessionStorage.setItem('fc_reload_once','1');
                      location.reload();
                    }
                  }).catch(function(err){ console.warn('[BuildCheck] ping failed', err); });
                } catch (e) { console.warn('[BuildCheck] error', e); }
              })();
            `,
          }}
        />
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
