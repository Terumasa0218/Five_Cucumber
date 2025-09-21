'use client';

import { getNickname } from "@/lib/profile";
import { upsertLocalRoom } from "@/lib/roomSystemUnified";
import type { Room } from "@/types/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

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
    document.body.setAttribute('data-bg', 'home');
    return () => { document.body.removeAttribute('data-bg'); };
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
      const data = await apiJson<any>('/friend/create', {
        method: 'POST',
        json: { roomSize: settings.roomSize, nickname: nickname, turnSeconds: settings.turnSeconds, maxCucumbers: settings.maxCucumbers }
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
        setError('ルーム作成に失敗しました');
      }
    } catch (e) {
      setError('作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const isAllSelected = () => {
    return settings.roomSize && settings.turnSeconds !== undefined && settings.maxCucumbers;
  };

  return (
    <main className="friend-room-page bg-overlay-home" style={{ overflow: 'auto' }}>
      <div className="friend-room-page__background" aria-hidden="true" />
      <div className="friend-room-page__container overlay-container">
        <header className="friend-room-page__header">
          <div>
            <p className="friend-room-page__eyebrow">ROOM SETTINGS</p>
            <h1 className="friend-room-page__title overlay-title">フレンドルームを作成</h1>
            <p className="friend-room-page__lead overlay-lead">
              対戦人数・制限時間・きゅうり数を選んで、招待する友達にぴったりの設定にしましょう。
            </p>
          </div>
        </header>

        <section className="friend-room-page__content">
          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>

          <div className="friend-room-card">
            <div className="friend-room-card__section">
              <h2 id="players-heading" className="friend-room-card__heading">対戦人数</h2>
              <div
                role="radiogroup"
                aria-labelledby="players-heading"
                className="friend-room-options"
                onKeyDown={(e) => handleKeyDown(e, [2, 3, 4, 5, 6], settings.roomSize, 'roomSize')}
              >
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    role="radio"
                    aria-checked={settings.roomSize === num}
                    tabIndex={settings.roomSize === num ? 0 : -1}
                    onClick={() => handleSettingChange('roomSize', num)}
                    className={`settings-radio-btn ${settings.roomSize === num ? 'selected' : ''}`}
                    disabled={isCreating}
                  >
                    {num}人
                  </button>
                ))}
              </div>
            </div>

            <div className="friend-room-card__section">
              <h2 id="time-heading" className="friend-room-card__heading">制限時間</h2>
              <div
                role="radiogroup"
                aria-labelledby="time-heading"
                className="friend-room-options"
                onKeyDown={(e) => handleKeyDown(e, [{ value: 5, label: '5秒' }, { value: 15, label: '15秒' }, { value: 30, label: '30秒' }, { value: 0, label: '無制限' }], settings.turnSeconds, 'turnSeconds')}
              >
                {[
                  { value: 5, label: '5秒' },
                  { value: 15, label: '15秒' },
                  { value: 30, label: '30秒' },
                  { value: 0, label: '無制限' }
                ].map(option => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={settings.turnSeconds === option.value}
                    tabIndex={settings.turnSeconds === option.value ? 0 : -1}
                    onClick={() => handleSettingChange('turnSeconds', option.value)}
                    className={`settings-radio-btn ${settings.turnSeconds === option.value ? 'selected' : ''}`}
                    disabled={isCreating}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="friend-room-card__section">
              <h2 id="cucumbers-heading" className="friend-room-card__heading">お漬物きゅうり数</h2>
              <div
                role="radiogroup"
                aria-labelledby="cucumbers-heading"
                className="friend-room-options"
                onKeyDown={(e) => handleKeyDown(e, [4, 5, 6, 7], settings.maxCucumbers, 'maxCucumbers')}
              >
                {[4, 5, 6, 7].map(num => (
                  <button
                    key={num}
                    role="radio"
                    aria-checked={settings.maxCucumbers === num}
                    tabIndex={settings.maxCucumbers === num ? 0 : -1}
                    onClick={() => handleSettingChange('maxCucumbers', num)}
                    className={`settings-radio-btn ${settings.maxCucumbers === num ? 'selected' : ''}`}
                    disabled={isCreating}
                  >
                    {num}本
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="friend-room-card__error" role="alert">{error}</p>
            )}

            <div className="friend-room-card__actions">
              <button
                onClick={handleCreateRoom}
                disabled={!isAllSelected() || isCreating}
                className={`friend-room-card__submit ${(!isAllSelected() || isCreating) ? 'is-disabled' : ''}`}
              >
                {isCreating ? '作成中...' : 'ルームを作成する'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/friend')}
                className="friend-room-card__link"
              >
                フレンド対戦トップに戻る
              </button>
            </div>
          </div>
        </section>
      </div>
      {/* 下段CTA（グリッド行3） */}
      <div className="friend-page__cta">
        <button
          onClick={handleCreateRoom}
          disabled={!isAllSelected() || isCreating}
          className={`friend-cta__primary ${(!isAllSelected() || isCreating) ? 'is-disabled' : ''}`}
        >
          {isCreating ? '作成中...' : 'ルームを作成する'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/friend')}
          className="friend-cta__secondary"
        >
          フレンド対戦トップに戻る
        </button>
      </div>
    </main>
  );
}
