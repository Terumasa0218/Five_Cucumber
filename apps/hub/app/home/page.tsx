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
      <div className="max-w-[960px] mx-auto flex flex-col gap-12 text-[#f8fafc]">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-4 backdrop-blur-sm bg-black/20 border border-white/10 rounded-3xl p-8">
          <h1 className="font-heading text-[clamp(22px,4vw,36px)] text-[#1a1a1a] drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">
            {t("homeTitle")}
          </h1>
          <p className="font-body text-[clamp(14px,1.6vw,18px)] text-[#2d2d2d] drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
            {t("homeSubtitle")}
          </p>
          {nickname ? (
            <p className="bg-emerald-500/90 text-emerald-950 border border-emerald-400 rounded-full px-4 py-2 font-semibold shadow-lg">
              {t("welcomeMessage", { name: nickname })}
            </p>
          ) : (
            <p className="font-body text-[#4a4a4a] bg-white/60 rounded-full px-4 py-2">{t("nicknameUnset")}</p>
          )}
        </section>

        {/* CTA */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
          <Link
            href="/cucumber/cpu/settings"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-white bg-blue-600 border-2 border-blue-500 hover:bg-blue-700 hover:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 shadow-lg hover:shadow-xl transition-all"
          >
            {t("cpuBattle")}
          </Link>
          <Link
            href="/friend"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-white bg-emerald-600 border-2 border-emerald-500 hover:bg-emerald-700 hover:border-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 shadow-lg hover:shadow-xl transition-all"
          >
            {t("friendBattle")}
          </Link>
          <Link
            href="/rules"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold text-white bg-purple-600 border-2 border-purple-500 hover:bg-purple-700 hover:border-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 shadow-lg hover:shadow-xl transition-all"
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
