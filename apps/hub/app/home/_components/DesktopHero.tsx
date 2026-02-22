import Link from "next/link";
import LanguageToggle from "./LanguageToggle";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  const normalizedName = username?.trim() || "GUEST";

  return (
    <>
      <div
        className="bg-cover bg-center bg-no-repeat"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/assets/home_f.png')",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      />
      <section className="home-hero-fonts relative flex min-h-screen w-full flex-col items-center justify-center text-[#2a2a2a]"
        style={{ zIndex: 1 }}>
        <div className="relative flex min-h-screen w-full max-w-5xl flex-col items-center justify-between px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex w-full items-start justify-between gap-4 text-sm font-semibold sm:text-base">
            <nav aria-label="補助リンク" className="flex flex-col gap-2 text-left">
              <Link href="/rules" className="underline underline-offset-4">
                📖 ルール説明
              </Link>
              <LanguageToggle className="underline underline-offset-4" />
            </nav>

            <div className="inline-flex items-center gap-2">
              <span>ユーザー:</span>
              <Link href="/setup" className="font-bold text-[#155724] underline underline-offset-4" aria-label={`${normalizedName}のプロフィール設定を開く`}>
                {normalizedName}
              </Link>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col items-center justify-center px-2 text-center">
            <h1 className="m-0 text-[clamp(40px,9vw,84px)] tracking-[0.12em] text-[#1f3d2a]">５本のきゅうり</h1>
            <div className="mt-6 grid w-full max-w-md gap-4">
              <Link
                href="/cucumber/cpu/settings"
                className="fc-button fc-button--primary w-full"
                aria-label="CPU対戦を始める"
              >
                CPU対戦
              </Link>
              <Link
                href="/friend/create"
                className="fc-button fc-button--secondary w-full"
                aria-label="フレンド対戦を始める"
              >
                フレンド対戦
              </Link>
            </div>
          </div>

          <footer aria-label="その他のリンク" className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold sm:gap-6 sm:text-base">
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
        </div>
      </section>
    </>
  );
}
