import Image from "next/image";
import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import styles from "./DesktopHero.module.css";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <Image src="/assets/home13.png" alt="" fill priority sizes="100vw" className={styles.backgroundImage} />

        <div className={styles.heroContent}>
          <h1 className={styles.title}>５本のきゅうり</h1>
          <div className={styles.actions}>
            <Link href="/play/cpu" className={`${styles.btn} ${styles.primary}`} aria-label="CPU対戦を始める">CPU対戦</Link>
            <p className={styles.note}>習うより慣れろ！まずはCPUとやってみよう！</p>
            <Link href="/play/friend" className={`${styles.btn} ${styles.secondary}`} aria-label="フレンド対戦を始める">フレンド対戦</Link>
            <p className={styles.note}>いつでも！どこでも！友達と！</p>
          </div>
        </div>

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


