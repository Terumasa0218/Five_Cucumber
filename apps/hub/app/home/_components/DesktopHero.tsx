import Link from 'next/link';
import LanguageToggle from './LanguageToggle';

type Props = { username?: string };

export default function DesktopHero({ username = 'GUEST' }: Props) {
  const normalizedName = username?.trim() || 'GUEST';

  return (
    <section className="home-shell">
      <header className="home-shell__topbar" aria-label="ホームナビゲーション">
        <nav className="home-shell__nav" aria-label="補助リンク">
          <Link href="/rules" className="home-shell__text-link">
            ルール
          </Link>
          <LanguageToggle className="home-shell__language" />
        </nav>

        <Link
          href="/setup"
          className="home-shell__profile"
          aria-label={`${normalizedName}のプロフィール設定を開く`}
        >
          <span className="home-shell__profile-label">ユーザー名</span>
          <strong>{normalizedName}</strong>
        </Link>
      </header>

      <div className="home-shell__content">
        <div className="home-shell__title-block">
          <p className="home-shell__eyebrow">FIVE CUCUMBER</p>
          <h1 className="home-shell__title">5本のきゅうり</h1>
          <p className="home-shell__lead">
            まずはCPU対戦で遊ぶか、フレンド対戦の入口からルーム作成・参加を選んでください。
          </p>
        </div>

        <div className="home-shell__primary-actions" aria-label="主な操作">
          <Link href="/cucumber/cpu/settings" className="home-shell__action home-shell__action--primary">
            <span>CPU対戦</span>
            <small>ひとりで開始</small>
          </Link>
          <Link href="/friend" className="home-shell__action home-shell__action--secondary">
            <span>フレンド対戦</span>
            <small>作成・参加を選ぶ</small>
          </Link>
        </div>

        <nav className="home-shell__quick-links" aria-label="ショートカット">
          <Link href="/setup">ユーザー名設定</Link>
          <Link href="/friend/create">ルーム作成</Link>
          <Link href="/friend/join">ルーム参加</Link>
          <Link href="/rules/cucumber5">ルール確認</Link>
        </nav>
      </div>
    </section>
  );
}
