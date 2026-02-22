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
        className="home-hero-fonts relative min-h-screen w-full text-[#2a2a2a]"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <header className="absolute left-4 top-4 right-4 z-10 flex items-center justify-between gap-4 text-sm font-semibold sm:text-base">
          <nav aria-label="補助リンク" className="flex items-center gap-4 text-left">
            <Link href="/rules" className="underline underline-offset-4">
              📖 ルール説明
            </Link>
            <LanguageToggle className="underline underline-offset-4" />
          </nav>

          <div className="inline-flex items-center gap-2">
            <span>ユーザー:</span>
            <Link
              href="/setup"
              className="font-bold text-[#155724] underline underline-offset-4"
              aria-label={`${normalizedName}のプロフィール設定を開く`}
            >
              {normalizedName}
            </Link>
          </div>
        </header>

        <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center sm:px-10">
          <h1 className="mb-12 text-5xl font-bold text-green-900 md:text-6xl">5本のきゅうり</h1>
          <div className="flex w-64 flex-col gap-6">
            <Link
              href="/cucumber/cpu/settings"
              aria-label="CPU対戦を始める"
              className="w-full rounded-lg bg-gradient-to-b from-green-400 to-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              CPU対戦
            </Link>
            <Link
              href="/online"
              aria-label="フレンド対戦を始める"
              className="w-full rounded-lg bg-gradient-to-b from-orange-300 to-orange-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              フレンド対戦
            </Link>
          </div>
        </div>

        <footer
          aria-label="その他のリンク"
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-6 text-sm font-semibold text-green-800 sm:text-base"
        >
          <Link href="/rules" className="underline underline-offset-4">
            ルール
          </Link>
          <Link href="/cucumber/cpu/settings" className="underline underline-offset-4">
            CPU対戦設定
          </Link>
          <Link href="/online" className="underline underline-offset-4">
            オンライン対戦
          </Link>
          <Link href="/friend/create" className="underline underline-offset-4">
            フレンド対戦
          </Link>
          <Link href="/setup" className="underline underline-offset-4">
            プロフィール設定
          </Link>
        </footer>
      </section>
    </>
  );
}
