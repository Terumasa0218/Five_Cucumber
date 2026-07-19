'use client';

import dynamic from 'next/dynamic';
import {
  clearChunkLoadRecovery,
  isChunkLoadError,
  openCpuPlayClassicView,
  recoverChunkLoadErrorOnce,
} from '@/lib/chunkRecovery';
import type { BattleV2SceneProps } from './BattleV2Scene';

const RECOVERY_SCOPE = 'battle-v2-scene';

function canOpenClassicCpuView(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.includes('/cucumber/cpu/play');
}

function BattleV2Reloading() {
  return (
    <div className="cpu-play-v2-load-failed" role="status">
      <h2>画面データを更新しています</h2>
      <p>対局画面の読み込みに失敗したため、最新のデータを読み直しています。</p>
    </div>
  );
}

function BattleV2LoadFailed() {
  const showClassicButton = canOpenClassicCpuView();

  return (
    <div className="cpu-play-v2-load-failed" role="alert">
      <h2>V2表示を読み込めませんでした</h2>
      <p>
        アプリ更新直後の古いキャッシュ、または一時的な通信失敗の可能性があります。
        再読み込みしても戻らない場合は、2D表示で対局を続けられます。
      </p>
      <div className="cpu-play-v2-load-failed__actions">
        <button type="button" onClick={() => window.location.reload()}>
          再読み込み
        </button>
        {showClassicButton ? (
          <button type="button" onClick={openCpuPlayClassicView}>
            2D表示で続行
          </button>
        ) : null}
      </div>
    </div>
  );
}

const LazyBattleV2Scene = dynamic<BattleV2SceneProps>(
  () =>
    import('./BattleV2Scene')
      .then(mod => {
        clearChunkLoadRecovery(RECOVERY_SCOPE);
        return mod.BattleV2Scene;
      })
      .catch(error => {
        console.error('[BattleV2Scene] Failed to load scene chunk:', error);

        if (isChunkLoadError(error) && recoverChunkLoadErrorOnce(RECOVERY_SCOPE)) {
          return BattleV2Reloading;
        }

        return BattleV2LoadFailed;
      }),
  {
    ssr: false,
    loading: () => (
      <div className="cpu-play-v2-loading" role="status">
        V2表示を読み込み中...
      </div>
    ),
  }
);

export default LazyBattleV2Scene;
