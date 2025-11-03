import Image from "next/image";
import Link from "next/link";
import styles from "./DesktopHero.module.css";
import LanguageToggle from "./LanguageToggle";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  const normalizedName = username?.trim() || "GUEST";

  return (
    <section className={`${styles.desktop} home-hero-fonts`}>
      <Image
        src="/home/home13-1.png"
        alt="ホーム画面の背景"
        fill
        priority
        sizes="100vw"
        className={styles.backgroundImage}
      />

      <div className={styles.inner}>
        <nav className={styles.sideNav} aria-label="補助リンク">
          <Link href="/rules" className={styles.linkMinor}>
            <span aria-hidden="true">📖</span>
            ルール説明
          </Link>
          <LanguageToggle className={styles.linkMinor} />
        </nav>

        <div className={styles.userPanel}>
          <span className={styles.userLabel}>ユーザー:</span>
          <Link
            href="/setup"
            className={styles.userName}
            aria-label={`${normalizedName}のプロフィール設定を開く`}
          >
            {normalizedName}
          </Link>
        </div>

        <div className={styles.hero}>
          <h1 className={styles.title}>５本のきゅうり</h1>
          <div className={styles.ctaGroup}>
            <p className={styles.subtitle}>習うより慣れろ！まずはCPUとやってみよう！</p>
            <Link
              href="/cucumber/cpu/settings"
              className={`${styles.ctaButton} fc-button fc-button--primary`}
              aria-label="CPU対戦を始める"
            >
              CPU対戦
            </Link>
          </div>
          <div className={styles.ctaGroup}>
            <p className={styles.note}>いつでも！どこでも！友達と！</p>
            <Link
              href="/friend/create"
              className={`${styles.ctaButton} fc-button fc-button--secondary`}
              aria-label="フレンド対戦を始める"
            >
              フレンド対戦
            </Link>
          </div>
        </div>

        <footer className={styles.footer} aria-label="その他のリンク">
          <Link href="/rules" className={styles.footerLink}>
            ルール
          </Link>
          <Link href="/cucumber/cpu/settings" className={styles.footerLink}>
            CPU対戦設定
          </Link>
          <Link href="/friend/create" className={styles.footerLink}>
            フレンド対戦
          </Link>
          <Link href="/setup" className={styles.footerLink}>
            プロフィール設定
          </Link>
        </footer>
      </div>
    </section>
  );
}


