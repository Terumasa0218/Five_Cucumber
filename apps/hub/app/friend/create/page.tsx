"use client";

import { FriendRoomLayout, RoomSettingsForm } from "@/components/ui";
import { apiJson } from "@/lib/api";
import { getNickname } from "@/lib/profile";
import { upsertLocalRoom } from "@/lib/roomSystemUnified";
import Link from "next/link";
import type { Room } from "@/types/room";
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
  type RadioOption = number | { value: number; label: string };

  const [settings, setSettings] = useState<FriendRoomSettings>({
    roomSize: 4,
    turnSeconds: 15,
    maxCucumbers: 5
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const getOptionValue = (option: RadioOption) =>
    typeof option === 'number' ? option : option.value;

  const handleSettingChange = (key: SettingKey, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    const labels: Record<SettingKey, Record<number, string>> = {
      roomSize: { 2: '2人', 3: '3人', 4: '4人', 5: '5人', 6: '6人' },
      turnSeconds: { 5: '5秒', 15: '15秒', 30: '30秒', 0: '無制限' },
      maxCucumbers: { 4: '4本', 5: '5本', 6: '6本', 7: '7本' }
    };

    const label = labels[key]?.[value];
    if (label) {
      setAnnouncement(`${label}を選択`);
      setTimeout(() => setAnnouncement(''), 2000);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    options: RadioOption[],
    currentValue: number,
    key: SettingKey
  ) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = options.findIndex(opt => getOptionValue(opt) === currentValue);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      const prevValue = getOptionValue(options[prevIndex]);
      handleSettingChange(key, prevValue);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = options.findIndex(opt => getOptionValue(opt) === currentValue);
      const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      const nextValue = getOptionValue(options[nextIndex]);
      handleSettingChange(key, nextValue);
    }
  };

  useEffect(() => {
    document.title = 'ルーム作成 | Five Cucumber';
  }, []);

  const handleCreateRoom = async () => {
    const nickname = getNickname();
    if (!nickname) {
      router.push('/setup?returnTo=/friend/create');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        roomSize: Number(settings.roomSize),
        nickname: nickname,
        turnSeconds: Number(settings.turnSeconds),
        maxCucumbers: Number(settings.maxCucumbers)
      };
      const data = await apiJson<any>('/api/friend/create', {
        method: 'POST',
        json: payload
      });
      if (data?.ok && data?.roomId) {
        try {
          const localRoom: Room = {
            id: data.roomId,
            size: settings.roomSize,
            seats: Array.from({ length: settings.roomSize }, (_, index) =>
              index === 0 ? { nickname } : null
            ),
            status: 'waiting',
            createdAt: Date.now(),
            turnSeconds: settings.turnSeconds,
            maxCucumbers: settings.maxCucumbers
          };
          upsertLocalRoom(localRoom);
        } catch {}
        router.push(`/friend/room/${data.roomId}`);
      } else {
        const reason = data?.reason || 'unknown-error';
        const detail = data?.detail ? ` (${data.detail})` : '';
        setError(`ルーム作成に失敗しました: ${reason}${detail}`);
      }
    } catch (e: any) {
      const msg = e?.message ? ` (${e.message})` : '';
      setError(`作成に失敗しました${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const isAllSelected = () => {
    return settings.roomSize && settings.turnSeconds !== undefined && settings.maxCucumbers;
  };

  return (
    <FriendRoomLayout
      title="フレンドルームを作成"
      eyebrow="ROOM SETTINGS"
      description="対戦人数・制限時間・きゅうり数を選んで、招待する友達にぴったりの設定にしましょう。"
      footer={
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/home" className="btn-secondary layout-footer__button">
              ホームに戻る
            </Link>
            <Link href="/friend" className="btn-secondary layout-footer__button">
              フレンド対戦トップに戻る
            </Link>
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={!isAllSelected() || isCreating}
            className="btn-primary layout-footer__button"
          >
            {isCreating ? '作成中...' : 'ルームを作成する'}
          </button>
        </>
      }
    >
      <div aria-live="polite" className="sr-only">{announcement}</div>
      <RoomSettingsForm
        settings={settings}
        disabled={isCreating}
        onChange={(next) => setSettings((prev) => ({ ...prev, ...next }))}
      />
      {error ? (
        <p className="text-sm text-red-200" role="alert">{error}</p>
      ) : null}
    </FriendRoomLayout>
  );
}
