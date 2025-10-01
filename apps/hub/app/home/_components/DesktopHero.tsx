import Image from "next/image";
import Link from "next/link";
import styles from "./DesktopHero.module.css";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  return (
    <section className={styles.hero}>
      {/* 背景を全面に */}
      <Image src="/home/home13-1.png" alt="" fill priority sizes="100vw" className={styles.heroBackgroundImage} />
      <div className={styles.inner}>

          <div className={styles.heroRibbon} aria-hidden="true">
            <svg
              className={styles.heroRibbonArt}
              viewBox="0 0 360 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <path id="hero-ribbon-path" d="M20 80C110 10 250 10 340 80" />
              </defs>
              <path
                d="M20 80C110 10 250 10 340 80"
                fill="none"
                stroke="rgba(255, 255, 255, 0.65)"
                strokeLinecap="round"
                strokeWidth="12"
              />
              <text
                fill="var(--fc-forest-900, #1f5130)"
                fontFamily="'Shippori Mincho', 'Inter', 'Noto Sans JP', sans-serif"
                fontSize="26"
                fontWeight="600"
              >
                <textPath href="#hero-ribbon-path" startOffset="50%" textAnchor="middle">
                  ようこそ！きゅうりの庭へ
                </textPath>
              </text>
            </svg>
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>５本のきゅうり</h1>
            <div className={styles.actions}>
              <Link href="/play/cpu" className={styles.fcHero_btn}>CPU対戦</Link>
              <Link href="/play/friend" className={`${styles.fcHero_btn} ${styles.secondary}`}>フレンド対戦</Link>
            </div>
            <p className={styles.note}>習うより慣れろ！まずはCPUとやってみよう！ いつでも！どこでも！友達と！</p>
          </div>

        {/* 左リンク列 */}
        <nav className={styles.sideLeft} aria-label="helper links">
          <Link href="/rules" className={styles.linkMinor}>📖ルール説明</Link>
          <Link href="/lang" className={styles.linkMinor}>🌐言語切替</Link>
        </nav>
        {/* 右上ユーザー枠 */}
        <div className={styles.userBox}><span>USER:</span><span className={styles.userName}>{username}</span></div>
      </div>
    </section>
  );
}


