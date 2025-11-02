"use client";

import { OptionToggleGroup, SettingsLayout } from '@/components/ui';
import Link from 'next/link';
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
    // 背景制御はレイアウトに委譲
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
    <SettingsLayout
      title="CPU 対戦の設定"
      description="ゲームの設定を調整してください"
      footer={
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/home" className="btn-secondary layout-footer__button">
              ホームに戻る
            </Link>
          </div>
          <button
            onClick={handleStart}
            disabled={!isAllSelected()}
            className="btn-primary layout-footer__button"
          >
            CPU対戦を開始
          </button>
        </>
      }
    >
      <div aria-live="polite" className="sr-only">{announcement}</div>

      <div className="grid gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">対戦人数</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">2〜6人から選択</p>
          <OptionToggleGroup
            id="players"
            label="対戦人数"
            options={[2,3,4,5,6].map(n=>({ value: n, label: `${n}人` }))}
            value={settings.players}
            onChange={(v)=>handleSettingChange('players', Number(v))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">制限時間</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">5, 10, 15, 20, 30秒から選択</p>
          <OptionToggleGroup
            id="turnSeconds"
            label="制限時間"
            options={[5,10,15,20,30].map(n=>({ value: n, label: `${n}秒` }))}
            value={settings.turnSeconds}
            onChange={(v)=>handleSettingChange('turnSeconds', Number(v))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">きゅうり数</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">4〜7本から選択</p>
          <OptionToggleGroup
            id="maxCucumbers"
            label="きゅうり数"
            options={[4,5,6,7].map(n=>({ value: n, label: `${n}本` }))}
            value={settings.maxCucumbers}
            onChange={(v)=>handleSettingChange('maxCucumbers', Number(v))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">CPU難易度</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">簡単 / 普通 / 難しい</p>
          <OptionToggleGroup
            id="cpuLevel"
            label="CPU難易度"
            options={[
              { value: 'easy', label: '簡単' },
              { value: 'normal', label: '普通' },
              { value: 'hard', label: '難しい' }
            ]}
            value={settings.cpuLevel}
            onChange={(v)=>handleSettingChange('cpuLevel', v)}
          />
        </section>

        {process.env.NODE_ENV === 'development' && (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">🔧 デバッグモード</h2>
            <label className="inline-flex items-center gap-3 text-[clamp(13px,1.6vw,16px)] text-white/80">
              <input
                type="checkbox"
                checked={settings.showAllHands}
                onChange={(e) => handleSettingChange('showAllHands', e.target.checked)}
              />
              <span>全員の手札を表示（開発用）</span>
            </label>
          </section>
        )}
      </div>
    </SettingsLayout>
  );
}