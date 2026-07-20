"use client";

import { RoomSettingsForm } from "@/components/ui";
import { apiJson, ApiRequestError } from "@/lib/api";
import { friendAuthFailureMessage } from "@/lib/friendApiErrors";
import { getNickname } from "@/lib/profile";
import { createRoom, getRoom, upsertLocalRoom } from "@/lib/roomSystemUnified";
import { USE_SERVER_SYNC } from "@/lib/serverSync";
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

  const serverSyncEnabled = USE_SERVER_SYNC;

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

  const roomFailureMessage = (reason?: string, detail?: unknown) => {
    const detailMessage =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "message" in detail
          ? String((detail as { message?: unknown }).message ?? "")
          : "";

    if (reason === "no-shared-store") {
      return "フレンド対戦のサーバー同期に必要な共有ストアが未設定です。ローカル確認ではサーバー同期をOFFにしてください。";
    }
    if (reason === "bad-request" || reason === "invalid-json") {
      return "ルーム設定に不正な値があります。設定を見直してください。";
    }
    if (reason === "kv-failed") {
      return "共有ストアへの保存に失敗しました。KV/Redis設定を確認してください。";
    }

    const suffix = detailMessage ? ` (${detailMessage})` : "";
    return `ルーム作成に失敗しました${reason ? `: ${reason}` : ""}${suffix}`;
  };

  const backendFailureMessage = (err: unknown) => {
    if (err instanceof ApiRequestError) {
      const body = err.response.data as (RoomResponse & { error?: string }) | undefined;
      const authMessage = friendAuthFailureMessage(err.response.status, body);
      if (authMessage) return authMessage;
      return roomFailureMessage(body?.reason, body?.detail ?? body?.error);
    }

    const message = err instanceof Error ? err.message : String(err);
    return `作成に失敗しました${message ? ` (${message})` : ""}`;
  };

  const canFallbackToLocalRoom = (err: unknown) => {
    if (serverSyncEnabled) return false;
    if (!(err instanceof ApiRequestError)) return true;
    const body = err.response.data as (RoomResponse & { error?: string }) | undefined;
    return (
      err.response.status === 0 ||
      err.response.status === 401 ||
      err.response.status === 503 ||
      body?.reason === "no-shared-store" ||
      body?.reason === "kv-failed"
    );
  };

  const createLocalRoom = (nickname: string) => {
    const result = createRoom(
      Number(settings.roomSize),
      nickname,
      Number(settings.turnSeconds),
      Number(settings.maxCucumbers),
    );

    if (!result.success || !result.roomId) {
      setError(roomFailureMessage(result.reason));
      return;
    }

    const localRoom = getRoom(result.roomId);
    if (localRoom) {
      upsertLocalRoom(localRoom);
    }
    router.push(`/friend/room/${result.roomId}`);
  };

  const handleCreateRoom = async () => {
    const nickname = getNickname();
    if (!nickname) {
      router.push("/setup?returnTo=/friend/create");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      if (!serverSyncEnabled) {
        createLocalRoom(nickname);
        return;
      }

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
        if (data?.reason === "no-shared-store" || data?.reason === "kv-failed") {
          setError(roomFailureMessage(data.reason, data.detail));
          return;
        }
        setError(roomFailureMessage(data?.reason, data?.detail));
      }
    } catch (e: unknown) {
      if (canFallbackToLocalRoom(e)) {
        createLocalRoom(nickname);
        return;
      }
      setError(backendFailureMessage(e));
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
