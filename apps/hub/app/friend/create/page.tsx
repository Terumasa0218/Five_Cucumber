'use client';

import { getNickname } from "@/lib/profile";
import { upsertLocalRoom } from "@/lib/roomSystemUnified";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FriendCreatePage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    roomSize: 4,
    turnSeconds: 15,
    maxCucumbers: 5
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // アクセシビリティ用の音声通知
    const labels: Record<string, Record<any, string>> = {
      roomSize: { 2: '2人', 3: '3人', 4: '4人', 5: '5人', 6: '6人' },
      turnSeconds: { 5: '5秒', 15: '15秒', 30: '30秒', 0: '無制限' },
      maxCucumbers: { 4: '4本', 5: '5本', 6: '6本', 7: '7本' }
    };
    
    if (labels[key] && labels[key][value]) {
      setAnnouncement(`${labels[key][value]}を選択`);
      setTimeout(() => setAnnouncement(''), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, options: any[], currentValue: any, key: string) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = options.findIndex(opt => 
        typeof opt === 'object' ? opt.value === currentValue : opt === currentValue
      );
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      const prevValue = typeof options[prevIndex] === 'object' ? options[prevIndex].value : options[prevIndex];
      handleSettingChange(key, prevValue);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = options.findIndex(opt => 
        typeof opt === 'object' ? opt.value === currentValue : opt === currentValue
      );
      const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      const nextValue = typeof options[nextIndex] === 'object' ? options[nextIndex].value : options[nextIndex];
      handleSettingChange(key, nextValue);
    }
  };

  useEffect(() => {
    document.title = 'ルーム作成 | Five Cucumber';
    document.body.setAttribute('data-bg', 'home');
    document.body.classList.add('no-scroll');
    
    return () => {
      document.body.removeAttribute('data-bg');
      document.body.classList.remove('no-scroll');
    };
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
      const res = await fetch('/api/friend/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomSize: settings.roomSize, 
          nickname,
          turnSeconds: settings.turnSeconds,
          maxCucumbers: settings.maxCucumbers
        })
      }).catch((err) => {
        // Safari/拡張のメッセージポートエラー等を吸収
        console.warn('Create room network error:', err);
        return new Response(JSON.stringify({ ok: false }), { status: 520 });
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.roomId) {
          try {
            upsertLocalRoom({ id: data.roomId, size: settings.roomSize, seats: Array.from({length: settings.roomSize}, () => null).map((v,i)=> i===0 ? { nickname } : v), status: 'waiting', createdAt: Date.now(), turnSeconds: settings.turnSeconds, maxCucumbers: settings.maxCucumbers } as any);
          } catch {}
          router.push(`/friend/room/${data.roomId}`);
        } else {
          setError('ルーム作成に失敗しました');
        }
      } else {
        switch (res.status) {
          case 400:
            setError('入力内容に問題があります');
            break;
          case 520:
            setError('ネットワークエラーが発生しました');
            break;
          case 500:
            setError('サーバーエラーが発生しました');
            break;
          default:
            setError('ルーム作成に失敗しました');
        }
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  const isAllSelected = () => {
    return settings.roomSize && settings.turnSeconds !== undefined && settings.maxCucumbers;
  };

  return (
    <main className="settings-page">
      <div className="settings-container">
        {/* 音声通知用 */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        <h1 className="sr-only" aria-label="フレンド対戦ルーム作成">フレンド対戦ルーム作成</h1>

        {/* 小見出し */}
        <div className="settings-subtitle">
          フレンド対戦のルームを作成します
        </div>

        {/* 対戦人数 */}
        <section className="settings-group">
          <h2 id="players-heading" className="settings-heading">対戦人数</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="players-heading"
            className="settings-buttons"
            onKeyDown={(e) => handleKeyDown(e, [2, 3, 4, 5, 6], settings.roomSize, 'roomSize')}
          >
            {[2, 3, 4, 5, 6].map((num, index) => (
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
        </section>

        {/* 制限時間 */}
        <section className="settings-group">
          <h2 id="time-heading" className="settings-heading">制限時間</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="time-heading"
            className="settings-buttons"
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
        </section>

        {/* お漬物きゅうり数 */}
        <section className="settings-group">
          <h2 id="cucumbers-heading" className="settings-heading">お漬物きゅうり数</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="cucumbers-heading"
            className="settings-buttons"
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
        </section>

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="settings-actions">
          <button
            onClick={handleCreateRoom}
            disabled={isCreating || !isAllSelected()}
            className={`settings-start-btn ${(isAllSelected() && !isCreating) ? 'enabled' : 'disabled'}`}
          >
            {isCreating ? '作成中...' : 'ルーム作成'}
          </button>
          
          <button
            onClick={() => router.push('/friend')}
            className="settings-back-btn"
            disabled={isCreating}
          >
            ← フレンド対戦に戻る
          </button>
        </div>
      </div>
    </main>
  );
}
