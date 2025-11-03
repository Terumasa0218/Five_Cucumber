"use client";

import { RoomSettingsForm } from "@/components/ui";
import { apiJson } from "@/lib/api";
import { getNickname } from "@/lib/profile";
import { upsertLocalRoom } from "@/lib/roomSystemUnified";
import type { Room, RoomResponse } from "@/types/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendCreatePage() {
  const router = useRouter();
  type FriendRoomSettings = {
    roomSize: number;
    turnSeconds: number;
    maxCucumbers: number;
  };

  type SettingKey = keyof FriendRoomSettings;

  type CreateRoomResponse = RoomResponse & { storage?: string };

  const [settings, setSettings] = useState<FriendRoomSettings>({
    roomSize: 4,
    turnSeconds: 15,
    maxCucumbers: 5,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const labels: Record<SettingKey, Record<number, string>> = {
    roomSize: { 2: "2人", 3: "3人", 4: "4人", 5: "5人", 6: "6人" },
    turnSeconds: { 5: "5秒", 15: "15秒", 30: "30秒", 0: "無制限" },
    maxCucumbers: { 4: "4本", 5: "5本", 6: "6本", 7: "7本" },
  };

  const applySettings = (partial: Partial<FriendRoomSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      const changedKey = Object.keys(partial)[0] as SettingKey | undefined;
      if (changedKey) {
        const value = next[changedKey];
        const label = labels[changedKey]?.[value];
        if (label) {
          setAnnouncement(`${label}を選択`);
          setTimeout(() => setAnnouncement(""), 2000);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    document.title = "ルーム作成 | Five Cucumber";
  }, []);

  const handleCreateRoom = async () => {
    const nickname = getNickname();
    if (!nickname) {
      router.push("/setup?returnTo=/friend/create");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        roomSize: Number(settings.roomSize),
        nickname,
        turnSeconds: Number(settings.turnSeconds),
        maxCucumbers: Number(settings.maxCucumbers),
      };
      const data = await apiJson<CreateRoomResponse>("/api/friend/create", {
        method: "POST",
        json: payload,
      });
      if (data?.ok && data?.roomId) {
        try {
          const localRoom: Room = {
            id: data.roomId,
            size: settings.roomSize,
            seats: Array.from({ length: settings.roomSize }, (_, index) =>
              index === 0 ? { nickname } : null,
            ),
            status: "waiting",
            createdAt: Date.now(),
            turnSeconds: settings.turnSeconds,
            maxCucumbers: settings.maxCucumbers,
          };
          upsertLocalRoom(localRoom);
        } catch {}
        router.push(`/friend/room/${data.roomId}`);
      } else {
        const reason = data?.reason || "unknown-error";
        const detail = data?.detail ? ` (${data.detail})` : "";
        setError(`ルーム作成に失敗しました: ${reason}${detail}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const msg = message ? ` (${message})` : "";
      setError(`作成に失敗しました${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const isAllSelected = () => {
    return Boolean(settings.roomSize && settings.turnSeconds !== undefined && settings.maxCucumbers);
  };

  return (
    <main className="friend-room-page">
      <div className="friend-room-page__background" aria-hidden="true" />
      <div className="friend-room-page__container">
        <header className="friend-room-page__header">
          <p className="friend-room-page__eyebrow">ROOM SETTINGS</p>
          <h1 className="friend-room-page__title">フレンドルームを作成</h1>
          <p className="friend-room-page__lead">
            対戦人数・制限時間・きゅうり数を選んで、招待する友達にぴったりの設定にしましょう。
          </p>
        </header>

        <section className="friend-room-page__content">
          <div className="friend-room-card friend-room-card--form">
            <div aria-live="polite" className="sr-only">
              {announcement}
            </div>

            <RoomSettingsForm
              settings={settings}
              disabled={isCreating}
              onChange={applySettings}
              className="friend-room-card__section"
            />

            {error ? (
              <p className="friend-room-card__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="friend-room-card__actions friend-room-card__actions--wide">
              <button
                type="button"
                onClick={() => router.push("/friend")}
                className="friend-room-card__link"
              >
                フレンド対戦トップに戻る
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!isAllSelected() || isCreating}
                className={`friend-room-card__submit ${!isAllSelected() || isCreating ? "is-disabled" : ""}`}
              >
                {isCreating ? "作成中..." : "ルームを作成する"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
