"use client";

import { BackgroundFrame } from "@/components/ui";
import { useI18n } from "@/hooks/useI18n";
import { getNickname } from "@/lib/profile";
import { useEffect, useState } from "react";
import DesktopHero from "./_components/DesktopHero";

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
      <DesktopHero username={nickname || t("nicknameUnset")} />
      {process.env.NODE_ENV === "development" && (
        <div className="debug-section">
          <p>
            <strong>Middleware Status:</strong> {gateStatus}
          </p>
          <p className="opacity-80">allow: 許可 / passed: 認証済み / required: 未認証→/setup</p>
        </div>
      )}
    </BackgroundFrame>
  );
}
