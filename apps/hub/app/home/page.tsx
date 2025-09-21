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
    <BackgroundFrame src="/images/home1.png" priority objectPosition="center">
      <div className="home-page safe-zone">
        {/* Hero */}
        <section className="home-hero card">
          <h1 className="home-hero__title">
            {t("homeTitle")}
          </h1>
          <p className="home-hero__subtitle">
            {t("homeSubtitle")}
          </p>
          {nickname ? (
            <p className="home-hero__welcome">
              {t("welcomeMessage", { name: nickname })}
            </p>
          ) : (
            <p className="home-hero__placeholder">{t("nicknameUnset")}</p>
          )}
        </section>

        {/* CTA */}
        <section className="home-actions">
          <Link
            href="/cucumber/cpu/settings"
            className="btn-primary home-actions__button home-actions__button--cpu"
          >
            {t("cpuBattle")}
          </Link>
          <Link
            href="/friend"
            className="btn-primary home-actions__button home-actions__button--friend"
          >
            {t("friendBattle")}
          </Link>
          <Link
            href="/rules"
            className="btn-primary home-actions__button home-actions__button--rules"
          >
            {t("rules")}
          </Link>
        </section>

        {process.env.NODE_ENV === "development" && (
          <div className="debug-section">
            <p>
              <strong>Middleware Status:</strong> {gateStatus}
            </p>
            <p className="opacity-80">allow: 許可 / passed: 認証済み / required: 未認証→/setup</p>
          </div>
        )}

        {/* Footer links */}
        <section className="home-footer-links">
          <Link href="/rules" className="home-footer-links__item">
            {t("rules")}
          </Link>
          <button
            onClick={() => changeLanguage(language === "ja" ? "en" : "ja")}
            className="home-footer-links__item"
          >
            {t("language")}
          </button>
        </section>
      </div>
    </BackgroundFrame>
  );
}
