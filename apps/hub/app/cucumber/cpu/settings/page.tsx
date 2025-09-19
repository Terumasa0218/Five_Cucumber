'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CpuSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    players: 4,
    turnSeconds: 15,
    maxCucumbers: 5,
    cpuLevel: 'normal' as 'easy' | 'normal' | 'hard',
    showAllHands: false
  });
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    document.body.setAttribute('data-bg', 'home');
    return () => { document.body.removeAttribute('data-bg'); };
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // アクセシビリティ用の音声通知
    const labels: Record<string, Record<any, string>> = {
      players: { 2: '2人', 3: '3人', 4: '4人', 5: '5人', 6: '6人' },
      turnSeconds: { 5: '5秒', 15: '15秒', 30: '30秒', 0: '無制限' },
      maxCucumbers: { 4: '4本', 5: '5本', 6: '6本', 7: '7本' },
      cpuLevel: { easy: '簡単', normal: '普通', hard: '難しい' }
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

  const handleStart = () => {
    const config = {
      players: settings.players,
      turnSeconds: settings.turnSeconds === 0 ? null : settings.turnSeconds,
      maxCucumbers: settings.maxCucumbers,
      initialCards: 7,
      cpuLevel: settings.cpuLevel
    };
    
    const params = new URLSearchParams();
    params.set('players', config.players.toString());
    params.set('turnSeconds', config.turnSeconds?.toString() || '0');
    params.set('maxCucumbers', config.maxCucumbers.toString());
    params.set('cpuLevel', config.cpuLevel);
    
    router.push(`/cucumber/cpu/play?${params.toString()}`);
  };

  const isAllSelected = () => {
    return settings.players && settings.turnSeconds !== undefined && settings.maxCucumbers && settings.cpuLevel;
  };

  return (
    <main className="settings-page bg-overlay-home" style={{ overflow: 'auto' }}>
      <div className="settings-container overlay-container">
        {/* 音声通知用 */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* 小見出し */}
        <div className="settings-subtitle">
          ゲームの設定を調整してください
        </div>

        {/* 対戦人数 */}
        <section className="settings-group">
          <h2 className="settings-heading">対戦人数</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="players-heading"
            className="settings-buttons"
            onKeyDown={(e) => handleKeyDown(e, [2, 3, 4, 5, 6], settings.players, 'players')}
          >
            {[2, 3, 4, 5, 6].map((num, index) => (
              <button
                key={num}
                role="radio"
                aria-checked={settings.players === num}
                tabIndex={settings.players === num ? 0 : -1}
                onClick={() => handleSettingChange('players', num)}
                className={`settings-radio-btn ${settings.players === num ? 'selected' : ''}`}
              >
                {num}人
              </button>
            ))}
          </div>
        </section>

        {/* 制限時間 */}
        <section className="settings-group">
          <h2 className="settings-heading">制限時間</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="time-heading"
            className="settings-buttons"
            onKeyDown={(e) => handleKeyDown(e, [
              { value: 5, label: '5秒' },
              { value: 15, label: '15秒' },
              { value: 30, label: '30秒' },
              { value: 0, label: '無制限' }
            ], settings.turnSeconds, 'turnSeconds')}
          >
            {[
              { value: 5, label: '5秒' },
              { value: 15, label: '15秒' },
              { value: 30, label: '30秒' },
              { value: 0, label: '無制限' }
            ].map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={settings.turnSeconds === option.value}
                tabIndex={settings.turnSeconds === option.value ? 0 : -1}
                onClick={() => handleSettingChange('turnSeconds', option.value)}
                className={`settings-radio-btn ${settings.turnSeconds === option.value ? 'selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* お漬物きゅうり数 */}
        <section className="settings-group">
          <h2 className="settings-heading">お漬物きゅうり数</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="cucumbers-heading"
            className="settings-buttons"
            onKeyDown={(e) => handleKeyDown(e, [4, 5, 6, 7], settings.maxCucumbers, 'maxCucumbers')}
          >
            {[4, 5, 6, 7].map((num) => (
              <button
                key={num}
                role="radio"
                aria-checked={settings.maxCucumbers === num}
                tabIndex={settings.maxCucumbers === num ? 0 : -1}
                onClick={() => handleSettingChange('maxCucumbers', num)}
                className={`settings-radio-btn ${settings.maxCucumbers === num ? 'selected' : ''}`}
              >
                {num}本
              </button>
            ))}
          </div>
        </section>

        {/* CPU難易度 */}
        <section className="settings-group">
          <h2 className="settings-heading">CPU難易度</h2>
          <div 
            role="radiogroup" 
            aria-labelledby="difficulty-heading"
            className="settings-buttons"
            onKeyDown={(e) => handleKeyDown(e, [
              { value: 'easy', label: '簡単' },
              { value: 'normal', label: '普通' },
              { value: 'hard', label: '難しい' }
            ], settings.cpuLevel, 'cpuLevel')}
          >
            {[
              { value: 'easy', label: '簡単' },
              { value: 'normal', label: '普通' },
              { value: 'hard', label: '難しい' }
            ].map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={settings.cpuLevel === option.value}
                tabIndex={settings.cpuLevel === option.value ? 0 : -1}
                onClick={() => handleSettingChange('cpuLevel', option.value)}
                className={`settings-radio-btn ${settings.cpuLevel === option.value ? 'selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* デバッグモード（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <section className="settings-group debug-section">
            <h2 className="settings-heading">🔧 デバッグモード</h2>
            <label className="debug-checkbox">
              <input
                type="checkbox"
                checked={settings.showAllHands}
                onChange={(e) => handleSettingChange('showAllHands', e.target.checked)}
              />
              <span>全員の手札を表示（開発用）</span>
            </label>
          </section>
        )}

        {/* はじめるボタン */}
        <div className="settings-actions">
          <button
            onClick={handleStart}
            disabled={!isAllSelected()}
            className={`settings-start-btn ${isAllSelected() ? 'enabled' : 'disabled'}`}
          >
            はじめる
          </button>
          
          <button
            onClick={() => router.push('/home')}
            className="settings-back-btn"
          >
            ← ホームに戻る
          </button>
        </div>
      </div>
    </main>
  );
}