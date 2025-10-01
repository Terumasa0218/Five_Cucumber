import Image from "next/image";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import styles from "./DesktopHero.module.css";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <article className={styles.heroCard}>
          <div className={styles.heroBackground} aria-hidden="true">
            <Image src="/home/home13-1.png" alt="" fill priority sizes="100vw" className={styles.backgroundImage} />
          </div>
          <div className={styles.overlay} aria-hidden="true" />

          <div className={styles.heroRibbon} aria-hidden="true">
            <svg className={styles.heroRibbonArt} viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <path id="hero-ribbon-path" d="M20 80C110 10 250 10 340 80" />
              </defs>
              <path d="M20 80C110 10 250 10 340 80" fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeLinecap="round" strokeWidth="12" />
              <text fill="var(--fc-forest-900, #1f5130)" fontFamily="'Shippori Mincho', 'Inter', 'Noto Sans JP', sans-serif" fontSize="26" fontWeight="600">
                <textPath href="#hero-ribbon-path" startOffset="50%" textAnchor="middle">
                  ようこそ！きゅうりの庭へ
                </textPath>
              </text>
            </svg>
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.title}>５本のきゅうり</h1>
            <div className={styles.actions}>
              <Link href="/play/cpu" className={`${styles.btn} ${styles.primary}`} aria-label="CPU対戦を始める">CPU対戦</Link>
              <p className={styles.note}>習うより慣れろ！まずはCPUとやってみよう！</p>
              <Link href="/play/friend" className={`${styles.btn} ${styles.secondary}`} aria-label="フレンド対戦を始める">フレンド対戦</Link>
              <p className={styles.note}>いつでも！どこでも！友達と！</p>
            </div>
          </div>
        </article>

        <nav className={styles.sideLeft} aria-label="helper links">
          <Link href="/rules" className={styles.linkMinor}>ルール説明</Link>
          <LanguageToggle className={styles.linkMinor} />
        </nav>

        <div className={styles.userBox}>
          <span className={styles.userLabel}>ユーザー：</span>
          <Link href="/account/username" className={styles.userName} aria-label={`${username}のアカウントページを開く`}>{username}</Link>
        </div>
      </div>
    </section>
  );
}


