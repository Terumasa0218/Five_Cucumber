"use client";

import { BackgroundFrame } from "@/components/ui";
import { useI18n } from "@/hooks/useI18n";
import { getNickname } from "@/lib/profile";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [gateStatus, setGateStatus] = useState<string>('');
  const [nickname, setNickname] = useState<string | null>(null);
  const { language, changeLanguage, t } = useI18n();

  useEffect(() => {
    document.title = `${t("homeTitle")} | Five Cucumber`;
    setNickname(getNickname());
    if (process.env.NODE_ENV === "development") {
      fetch("/home", { method: "HEAD" })
        .then((response) => {
          const gateHeader = response.headers.get("x-profile-gate");
          setGateStatus(gateHeader || "unknown");
        })
        .catch(() => setGateStatus("error"));
    }
    const handleStorageChange = () => {
      setNickname(getNickname());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [t]);

  return (
    <BackgroundFrame src="/images/home13.png" priority objectPosition="center">
      <div className="home-landing">
        <header className="home-landing__meta">
          <nav className="home-landing__links">
            <Link href="/rules" className="home-landing__link">
              <span>📖</span>
              <span>ルール説明</span>
            </Link>
            <button
              onClick={() => changeLanguage(language === "ja" ? "en" : "ja")}
              className="home-landing__link"
            >
              <span>🌐</span>
              <span>言語切替</span>
            </button>
          </nav>
          <div className="home-landing__username">{nickname || t("nicknameUnset")}</div>
        </header>

        <h1 className="home-landing__title">5本のきゅうり</h1>

        <section className="home-landing__cta">
          <Link
            href="/cucumber/cpu/settings"
            className="home-landing__button home-landing__button--cpu"
          >
            CPU対戦
          </Link>
          <p className="home-landing__hint">習うより慣れろ！まずはCPUとやってみよう！</p>

          <Link
            href="/friend"
            className="home-landing__button home-landing__button--friend"
          >
            フレンド対戦
          </Link>
          <p className="home-landing__hint">いつでも！どこでも！友達と！</p>
        </section>

        {process.env.NODE_ENV === "development" && (
          <div className="debug-section">
            <p>
              <strong>Middleware Status:</strong> {gateStatus}
            </p>
            <p className="opacity-80">allow: 許可 / passed: 認証済み / required: 未認証→/setup</p>
          </div>
        )}
      </div>
    </BackgroundFrame>
  );
}
