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
      <div className="max-w-[960px] mx-auto flex flex-col gap-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-4">
          <h1 className="font-heading text-[clamp(22px,4vw,36px)]">
            {t("homeTitle")}
          </h1>
          <p className="font-body text-[clamp(14px,1.6vw,18px)] text-white/80">
            {t("homeSubtitle")}
          </p>
          {nickname ? (
            <p className="bg-white/10 border border-white/20 rounded-full px-4 py-2">
              {t("welcomeMessage", { name: nickname })}
            </p>
          ) : (
            <p className="font-body text-white/60">ユーザー名: 未設定</p>
          )}
        </section>

        {/* CTA */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
          <Link
            href="/cucumber/cpu/settings"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-[#f8fafc] bg-black/35 border border-white/10 hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            {t("cpuBattle")}
          </Link>
          <Link
            href="/friend"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-[#f8fafc] bg-black/35 border border-white/10 hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            {t("friendBattle")}
          </Link>
          <Link
            href="/rules"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-[#f8fafc] bg-black/35 border border-white/10 hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            {t("rules")}
          </Link>
        </section>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl px-4 py-3 text-xs text-amber-100">
            <p>
              <strong>Middleware Status:</strong> {gateStatus}
            </p>
            <p className="opacity-80">allow: 許可 / passed: 認証済み / required: 未認証→/setup</p>
          </div>
        )}

        {/* Footer links */}
        <section className="flex flex-wrap justify-center gap-6 text-[clamp(14px,1.6vw,18px)] text-white/80">
          <Link href="/rules" className="hover:text-white">
            {t("rules")}
          </Link>
          <button
            onClick={() => changeLanguage(language === "ja" ? "en" : "ja")}
            className="hover:text-white"
          >
            {t("language")}
          </button>
        </section>
      </div>
    </BackgroundFrame>
  );
}
