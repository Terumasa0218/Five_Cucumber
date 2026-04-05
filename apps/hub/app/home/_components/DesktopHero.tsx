import Link from 'next/link';
import LanguageToggle from './LanguageToggle';

type Props = { username?: string };

export default function DesktopHero({ username = 'GUEST' }: Props) {
  const normalizedName = username?.trim() || 'GUEST';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: "url('/assets/home_f.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden
      />
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          width: '100%',
          color: '#2a2a2a',
        }}
      >
        <header
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            right: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 2,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <nav
            aria-label="補助リンク"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}
          >
            <Link href="/rules" style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>
              📖 ルール説明
            </Link>
            <div style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>
              <LanguageToggle className="" />
            </div>
          </nav>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>ユーザー:</span>
            <Link
              href="/setup"
              style={{
                fontWeight: 'bold',
                color: '#155724',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
              }}
              aria-label={`${normalizedName}のプロフィール設定を開く`}
            >
              {normalizedName}
            </Link>
          </div>
        </header>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '4rem',
              fontWeight: 'bold',
              color: '#1a4d1a',
              marginBottom: '3rem',
              textShadow: '2px 2px 4px rgba(255,255,255,0.7)',
            }}
          >
            5本のきゅうり
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '320px' }}>
            <Link
              href="/cucumber/cpu/settings"
              aria-label="CPU対戦を始める"
              style={{ textDecoration: 'none' }}
            >
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '1.2rem 2rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  background: 'linear-gradient(to bottom, #4ade80, #16a34a)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                CPU対戦
              </button>
            </Link>
            <Link
              href="/friend/create"
              aria-label="フレンド対戦を始める"
              style={{ textDecoration: 'none' }}
            >
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '1.2rem 2rem',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  background: 'linear-gradient(to bottom, #fdba74, #f97316)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                フレンド対戦
              </button>
            </Link>
          </div>
        </div>

        <footer
          aria-label="その他のリンク"
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '2rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#1a4d1a',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link href="/rules" style={{ color: '#1a4d1a', textDecoration: 'underline' }}>
            ルール
          </Link>
          <Link
            href="/cucumber/cpu/settings"
            style={{ color: '#1a4d1a', textDecoration: 'underline' }}
          >
            CPU対戦設定
          </Link>
          <Link href="/online" style={{ color: '#1a4d1a', textDecoration: 'underline' }}>
            オンライン対戦
          </Link>
          <Link href="/friend/create" style={{ color: '#1a4d1a', textDecoration: 'underline' }}>
            フレンド対戦
          </Link>
          <Link href="/setup" style={{ color: '#1a4d1a', textDecoration: 'underline' }}>
            プロフィール設定
          </Link>
        </footer>
      </section>
    </>
  );
}
