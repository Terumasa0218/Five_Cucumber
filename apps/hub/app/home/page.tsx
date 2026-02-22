"use client";

import { useI18n } from "@/hooks/useI18n";
import { getNickname } from "@/lib/profile";
import { useEffect, useState } from "react";
import DesktopHero from "./_components/DesktopHero";

export default function Home() {
  const [nickname, setNickname] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    document.title = `${t("homeTitle")} | Five Cucumber`;
    setNickname(getNickname());

    const handleStorageChange = () => {
      setNickname(getNickname());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [t]);

  return (
    <main className="min-h-screen w-full">
      <DesktopHero username={nickname || t("nicknameUnset")} />
    </main>
  );
}
