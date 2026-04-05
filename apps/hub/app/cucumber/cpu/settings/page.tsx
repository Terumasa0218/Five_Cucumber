"use client";

import { OptionToggleGroup, SettingsLayout } from '@/components/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GameSettings {
  players: number;
  turnSeconds: number;
  maxCucumbers: number;
  cpuLevel: 'easy' | 'normal' | 'hard';
  showAllHands: boolean;
}

type SettingKey = keyof GameSettings;

type OptionValue = number | string;

export default function CpuSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<GameSettings>({
    players: 4,
    turnSeconds: 15,
    maxCucumbers: 5,
    cpuLevel: 'normal',
    showAllHands: false
  });
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // 背景制御はレイアウトに委譲
  }, []);

  const handleSettingChange = <K extends SettingKey>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // アクセシビリティ用の音声通知
    const labels: Record<SettingKey, Record<OptionValue, string>> = {
      players: { 2: '2人', 3: '3人', 4: '4人', 5: '5人', 6: '6人' },
      turnSeconds: { 10: '10秒', 15: '15秒', 20: '20秒', 30: '30秒', 0: '無制限' },
      maxCucumbers: { 5: '5本', 6: '6本', 7: '7本', 10: '10本' },
      cpuLevel: { easy: 'やさしい', normal: 'ふつう', hard: 'つよい' },
      showAllHands: {}
    };
    
    const keyLabels = labels[key];
    if (keyLabels && (typeof value === 'string' || typeof value === 'number') && value in keyLabels) {
      const label = keyLabels[value as OptionValue];
      if (label) {
        setAnnouncement(`${label}を選択`);
        setTimeout(() => setAnnouncement(''), 2000);
      }
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
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">10〜30秒、または無制限</p>
          <OptionToggleGroup
            id="turnSeconds"
            label="制限時間"
            options={[
              { value: 10, label: '10秒' },
              { value: 15, label: '15秒' },
              { value: 20, label: '20秒' },
              { value: 30, label: '30秒' },
              { value: 0, label: 'なし' },
            ]}
            value={settings.turnSeconds}
            onChange={(v)=>handleSettingChange('turnSeconds', Number(v))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">きゅうり数</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">5〜10本から選択</p>
          <OptionToggleGroup
            id="maxCucumbers"
            label="きゅうり数"
            options={[5,6,7,10].map(n=>({ value: n, label: `${n}本` }))}
            value={settings.maxCucumbers}
            onChange={(v)=>handleSettingChange('maxCucumbers', Number(v))}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">CPU難易度</h2>
          <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">やさしい / ふつう / つよい</p>
          <OptionToggleGroup
            id="cpuLevel"
            label="CPU難易度"
            options={[
              { value: 'easy', label: 'やさしい' },
              { value: 'normal', label: 'ふつう' },
              { value: 'hard', label: 'つよい' }
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