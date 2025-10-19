import Image from "next/image";
import Link from "next/link";
import styles from "./DesktopHero.module.css";
import LanguageToggle from "./LanguageToggle";

type Props = { username?: string };

export default function DesktopHero({ username = "GUEST" }: Props) {
  return (
    <section className={styles.hero + ' home-hero-fonts'}>
      <Image src="/home/home13-1.png" alt="ホーム画面の背景" fill priority sizes="100vw" className={styles.backgroundImage} />
      <Image src="/home/text-on-a-path.png" alt="" role="presentation" priority sizes="35vw" className={styles.ribbon} />
      <div className={styles.inner}>
        <nav className={styles.sideLeft} aria-label="helper links">
          <Link href="/rules" className={styles.linkMinor}>📖<span aria-hidden="true"> </span>ルール説明</Link>
          <LanguageToggle className={styles.linkMinor} />
        </nav>

        <div className={styles.userBox}>
          <span className={styles.userLabel}>ユーザー：</span>
          <Link href="/setup" className={styles.userName} aria-label={`${username}のアカウント設定ページを開く`}>{username}</Link>
        </div>

        <div className={styles.heroContent}>
          <h1 className={styles.title}>５本のきゅうり</h1>
          <p className={styles.subtitle}>習うより慣れろ！まずはCPUとやってみよう！</p>
          <p className={styles.note}>いつでも！どこでも！友達と！</p>
          <div className={styles.cta}>
            <Link href="/cucumber/cpu/settings" className={`${styles.btn} ${styles.primary}`} aria-label="CPU対戦を始める">CPU対戦</Link>
            <Link href="/friend/create" className={`${styles.btn} ${styles.secondary}`} aria-label="フレンド対戦を始める">フレンド対戦</Link>
          </div>
        </div>
      </div>
    </section>
  );
}


