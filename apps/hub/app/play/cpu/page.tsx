'use client';

import { applyMove, createInitialState } from '@/lib/game-core/engine';
import { SeededRng } from '@/lib/game-core/rng';
import { getCucumberCount, getLegalMoves, getPlayerName } from '@/lib/game-core/rules';
import type { GameConfig, GameState } from '@/lib/game-core/types';
import type { Cucumber5Card, Cucumber5Player, Cucumber5State } from '@five-cucumber/sdk';
import { cpuManager } from 'games/cucumber5/cpu';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const HUMAN_PLAYER_INDEX = 0;

function toSdkCard(card: number): Cucumber5Card {
  return { number: card, cucumbers: getCucumberCount(card) };
}

function toSdkState(state: GameState): Cucumber5State {
  return {
    players: state.players.map((player, index) => ({
      id: `p-${index}`,
      name: getPlayerName(index),
      hand: player.hand.map(toSdkCard),
      cucumbers: player.cucumbers,
      graveyard: player.graveyard.map(toSdkCard),
      isCPU: index !== HUMAN_PLAYER_INDEX
    })),
    currentPlayer: state.currentPlayer,
    fieldCard: state.fieldCard === null ? null : toSdkCard(state.fieldCard),
    sharedGraveyard: state.sharedGraveyard.map(toSdkCard),
    round: state.currentRound,
    trick: state.currentTrick,
    trickCards: state.trickCards.map((entry) => ({
      player: entry.player,
      card: toSdkCard(entry.card)
    })),
    timeLeft: 0,
    phase: state.phase === 'GameEnd' ? 'game_over' : 'playing',
    turn: state.currentTrick,
    data: {}
  };
}

export default function PlayCpuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gameTime, setGameTime] = useState(0);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [statusText, setStatusText] = useState('ゲームを初期化しています...');

  const rngRef = useRef<SeededRng | null>(null);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameSettings = useMemo(() => {
    const playersParam = Number(searchParams.get('players') || '4');
    const players = Number.isInteger(playersParam) ? Math.min(6, Math.max(2, playersParam)) : 4;
    const cpuLevelParam = searchParams.get('difficulty');
    const cpuLevel = cpuLevelParam === 'easy' || cpuLevelParam === 'hard' || cpuLevelParam === 'normal'
      ? cpuLevelParam
      : 'normal';

    return {
      players,
      cpuLevel
    } as const;
  }, [searchParams]);

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';

    const timer = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (cpuTimerRef.current) {
        clearTimeout(cpuTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextConfig: GameConfig = {
      players: gameSettings.players,
      turnSeconds: null,
      maxCucumbers: 5,
      initialCards: 7,
      cpuLevel: gameSettings.cpuLevel,
      seed: Date.now()
    };

    const rng = new SeededRng(nextConfig.seed);
    rngRef.current = rng;
    setConfig(nextConfig);
    setGameState(createInitialState(nextConfig, rng));
    setStatusText('ゲーム開始。あなたの手札から1枚選んでください。');
    setGameTime(0);
  }, [gameSettings]);

  useEffect(() => {
    if (!gameState || !config || gameState.isGameOver) {
      return;
    }

    if (gameState.currentPlayer === HUMAN_PLAYER_INDEX || gameState.phase !== 'AwaitMove') {
      return;
    }

    const currentPlayer = gameState.currentPlayer;
    setStatusText(`${getPlayerName(currentPlayer)} が考え中...`);

    cpuTimerRef.current = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || prev.currentPlayer === HUMAN_PLAYER_INDEX || prev.phase !== 'AwaitMove' || !rngRef.current) {
          return prev;
        }

        const sdkState = toSdkState(prev);
        const sdkPlayer = sdkState.players[prev.currentPlayer] as Cucumber5Player;
        const cpuAction = cpuManager.getCPUAction(sdkPlayer, sdkState, config.cpuLevel);
        const legalMoves = getLegalMoves(prev, prev.currentPlayer);
        const selectedCard = cpuAction?.number ?? legalMoves[0];

        const result = applyMove(prev, {
          player: prev.currentPlayer,
          card: selectedCard,
          timestamp: Date.now()
        }, config, rngRef.current);

        if (!result.success) {
          setStatusText(`CPUの行動に失敗しました: ${result.message ?? 'unknown error'}`);
          return prev;
        }

        if (result.newState.isGameOver) {
          setStatusText('ゲーム終了！結果を確認してください。');
        } else if (result.newState.currentPlayer === HUMAN_PLAYER_INDEX) {
          setStatusText('あなたのターンです。手札を選択してください。');
        } else {
          setStatusText(`${getPlayerName(result.newState.currentPlayer)} のターンです。`);
        }

        return result.newState;
      });
    }, cpuManager.getThinkingTime(config.cpuLevel));

    return () => {
      if (cpuTimerRef.current) {
        clearTimeout(cpuTimerRef.current);
      }
    };
  }, [config, gameState]);

  const handlePlayCard = (card: number) => {
    if (!gameState || !config || !rngRef.current) {
      return;
    }

    if (gameState.currentPlayer !== HUMAN_PLAYER_INDEX || gameState.phase !== 'AwaitMove') {
      return;
    }

    const result = applyMove(gameState, {
      player: HUMAN_PLAYER_INDEX,
      card,
      timestamp: Date.now()
    }, config, rngRef.current);

    if (!result.success) {
      setStatusText(`カードを出せません: ${result.message ?? 'illegal move'}`);
      return;
    }

    if (result.newState.isGameOver) {
      setStatusText('ゲーム終了！結果を確認してください。');
    } else {
      setStatusText(`${getPlayerName(result.newState.currentPlayer)} のターンです。`);
    }

    setGameState(result.newState);
  };

  const handleEndGame = () => {
    router.push('/cpu/settings');
  };

  const humanHand = gameState?.players[HUMAN_PLAYER_INDEX]?.hand ?? [];
  const legalMoves = gameState ? getLegalMoves(gameState, HUMAN_PLAYER_INDEX) : [];

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4 pb-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">CPU対戦</h1>
          <p className="text-sm text-gray-600 mb-1">経過時間: {gameTime}秒</p>
          <p className="text-sm text-gray-600 mb-6">{statusText}</p>

          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl mx-auto text-left space-y-4">
            <div className="text-sm text-gray-700">
              <div>ラウンド: {gameState?.currentRound ?? '-'}</div>
              <div>トリック: {gameState?.currentTrick ?? '-'}</div>
              <div>場札: {gameState?.fieldCard ?? 'なし'}</div>
              <div>現在手番: {gameState ? getPlayerName(gameState.currentPlayer) : '-'}</div>
              <div>設定: {gameSettings.players}人 / CPU {gameSettings.cpuLevel}</div>
            </div>

            <div className="rounded border p-3 bg-gray-50">
              <h2 className="font-semibold mb-2">プレイヤー状況</h2>
              <div className="space-y-1 text-sm">
                {gameState?.players.map((player, idx) => (
                  <div key={idx}>
                    {getPlayerName(idx)}: きゅうり {player.cucumbers}本 / 手札 {player.hand.length}枚
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border p-3">
              <h2 className="font-semibold mb-2">このトリックで出たカード</h2>
              <div className="text-sm text-gray-700">
                {gameState?.trickCards.length
                  ? gameState.trickCards.map((entry) => `${getPlayerName(entry.player)}:${entry.card}`).join(' / ')
                  : 'まだ出ていません'}
              </div>
            </div>

            <div className="rounded border p-3">
              <h2 className="font-semibold mb-2">あなたの手札（クリックして出す）</h2>
              <div className="flex flex-wrap gap-2">
                {humanHand.map((card, idx) => {
                  const canPlay = gameState?.currentPlayer === HUMAN_PLAYER_INDEX && legalMoves.includes(card);

                  return (
                    <button
                      key={`${card}-${idx}`}
                      type="button"
                      onClick={() => handlePlayCard(card)}
                      disabled={!canPlay || Boolean(gameState?.isGameOver)}
                      className={`px-3 py-2 rounded border text-sm ${
                        canPlay ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-400 border-gray-300'
                      }`}
                    >
                      {card} ({getCucumberCount(card)}🥒)
                    </button>
                  );
                })}
              </div>
            </div>

            {gameState?.isGameOver && (
              <div className="rounded border border-green-300 bg-green-50 p-3">
                <h2 className="font-semibold mb-2">ゲーム結果</h2>
                <ul className="text-sm space-y-1">
                  {gameState.players
                    .map((player, idx) => ({ idx, cucumbers: player.cucumbers }))
                    .sort((a, b) => a.cucumbers - b.cucumbers)
                    .map((row) => (
                      <li key={row.idx}>{getPlayerName(row.idx)}: {row.cucumbers}本</li>
                    ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleEndGame}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              対戦終了
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
