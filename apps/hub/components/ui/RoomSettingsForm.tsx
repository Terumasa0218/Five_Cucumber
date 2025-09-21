"use client";

import { RoomOptionToggleGroup } from ".";

export type RoomSettings = {
  roomSize: number;
  turnSeconds: number;
  maxCucumbers: number;
};

export type RoomSettingsFormProps = {
  settings: RoomSettings;
  disabled?: boolean;
  onChange: (next: Partial<RoomSettings>) => void;
  className?: string;
};

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function RoomSettingsForm({ settings, disabled, onChange, className }: RoomSettingsFormProps) {
  return (
    <div className={mergeClassNames("grid gap-8", disabled ? "opacity-40 pointer-events-none" : undefined, className)}>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">対戦人数</h2>
        <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">2〜6人から選択</p>
        <RoomOptionToggleGroup
          id="room-size"
          label="対戦人数"
          value={settings.roomSize}
          onChange={(v) => onChange({ roomSize: Number(v) })}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}人` }))}
          srHint="対戦人数を選択"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">制限時間</h2>
        <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">5, 10, 15, 20, 30秒から選択</p>
        <RoomOptionToggleGroup
          id="turn-seconds"
          label="制限時間"
          value={settings.turnSeconds}
          onChange={(v) => onChange({ turnSeconds: Number(v) })}
          options={[5, 10, 15, 20, 30].map((n) => ({ value: n, label: `${n}秒` }))}
          srHint="制限時間を選択"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-[clamp(18px,2.6vw,24px)]">きゅうり数</h2>
        <p className="text-white/80 text-[clamp(13px,1.6vw,16px)]">4〜7本から選択</p>
        <RoomOptionToggleGroup
          id="max-cucumbers"
          label="きゅうり数"
          value={settings.maxCucumbers}
          onChange={(v) => onChange({ maxCucumbers: Number(v) })}
          options={[4, 5, 6, 7].map((n) => ({ value: n, label: `${n}本` }))}
          srHint="きゅうり数を選択"
        />
      </section>
    </div>
  );
}


