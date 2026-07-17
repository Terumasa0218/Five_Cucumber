'use client';

import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import Link from 'next/link';
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TextureLoader, Vector3 } from 'three';
import type { Group } from 'three';
import {
  GameConfig,
  GameState,
  Move,
  SeededRng,
  applyMove,
  createInitialState,
  getLegalMoves,
} from '@/lib/game-core';
import { battleV2Assets, type BattleV2AssetSlot } from '@/lib/battle-v2/assets';
import {
  animationConfig,
  cameraConfig,
  cardGeometry,
  clampHandCount,
  clampPlayers,
  createDemoHand,
  getHandCardPose,
  getOpponentCardPose,
  pilePositions,
  seatLayouts,
  type CardPose,
  type Euler3,
  type Vec3,
} from '@/lib/battle-v2/layout';
import styles from './battle-v2.module.css';

type CardView = {
  id: string;
  value: number;
};

type MovingCard = {
  id: string;
  value: number;
  from: CardPose;
  to: CardPose;
};

function createDemoConfig(players: number, handCount: number): GameConfig {
  return {
    players: clampPlayers(players),
    turnSeconds: 15,
    maxCucumbers: 5,
    initialCards: clampHandCount(handCount),
    cpuLevel: 'normal',
    seed: 20260715,
    minTurnMs: 500,
    minResolveMs: 600,
  };
}

function createDemoState(config: GameConfig): GameState {
  const rng = new SeededRng(config.seed);
  const state = createInitialState(config, rng);
  return {
    ...state,
    currentPlayer: 0,
    firstPlayer: 0,
    fieldCard: null,
    trickCards: [],
    sharedGraveyard: [2, 5],
    phase: 'AwaitMove',
    players: state.players.map((player, index) => ({
      ...player,
      hand: index === 0 ? createDemoHand(config.initialCards) : player.hand,
    })),
  };
}

function toCardViews(hand: number[]): CardView[] {
  return hand.map((value, index) => ({ id: `${value}-${index}`, value }));
}

function TextureMaterial({ slot }: { slot: BattleV2AssetSlot }) {
  if (!slot.textureUrl) {
    return <meshStandardMaterial color={slot.color} roughness={0.68} metalness={0.05} />;
  }
  return <TextureMaterialWithMap slot={slot} url={slot.textureUrl} />;
}

function TextureMaterialWithMap({ slot, url }: { slot: BattleV2AssetSlot; url: string }) {
  const texture = useLoader(TextureLoader, url);
  return (
    <meshStandardMaterial
      map={texture}
      color={slot.color}
      roughness={0.68}
      metalness={0.04}
    />
  );
}

function CameraRig() {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(...cameraConfig.target), []);

  const applyCameraPose = () => {
    camera.position.set(...cameraConfig.position);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  };

  useLayoutEffect(() => {
    applyCameraPose();
  });

  useFrame(() => {
    applyCameraPose();
  });

  return null;
}

function SceneRenderLoop() {
  const { gl, scene, camera } = useThree();

  useFrame(() => {
    gl.render(scene, camera);
  }, 1);

  return null;
}

function Card3D({
  value,
  faceUp,
  selected,
  onSelect,
}: {
  value: number;
  faceUp: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect?.();
  };

  return (
    <group onPointerDown={handlePointerDown}>
      <mesh castShadow receiveShadow position={[0, cardGeometry.thickness / 2, 0]}>
        <boxGeometry args={[cardGeometry.width, cardGeometry.thickness, cardGeometry.height]} />
        <meshStandardMaterial
          color={battleV2Assets.cardSide.color}
          roughness={0.58}
          metalness={0.03}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        position={[0, cardGeometry.thickness + 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[cardGeometry.width * 0.94, cardGeometry.height * 0.94]} />
        <TextureMaterial slot={faceUp ? battleV2Assets.cardFace : battleV2Assets.cardBack} />
      </mesh>

      {faceUp ? (
        <Suspense fallback={null}>
          <Text
            position={[0, cardGeometry.thickness + 0.011, -0.08]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.24}
            color={value === 15 ? '#b03a2e' : '#1f1b13'}
            anchorX="center"
            anchorY="middle"
          >
            {String(value)}
          </Text>
          <Text
            position={[0, cardGeometry.thickness + 0.012, 0.22]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.08}
            color="#267842"
            anchorX="center"
            anchorY="middle"
          >
            cucumber
          </Text>
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <Text
            position={[0, cardGeometry.thickness + 0.011, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.11}
            color="#d6c488"
            anchorX="center"
            anchorY="middle"
          >
            V2
          </Text>
        </Suspense>
      )}

      {selected ? (
        <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.54, 48]} />
          <meshBasicMaterial color="#f3d36a" transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

function PosedCard({
  pose,
  card,
  faceUp,
  selected,
  onSelect,
}: {
  pose: CardPose;
  card: CardView;
  faceUp: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <group position={pose.position} rotation={pose.rotation} scale={pose.scale}>
      <Card3D value={card.value} faceUp={faceUp} selected={selected} onSelect={onSelect} />
    </group>
  );
}

function AnimatedCard({
  movingCard,
  onComplete,
}: {
  movingCard: MovingCard;
  onComplete: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current || completedRef.current) return;
    elapsedRef.current += delta * 1000;
    const t = Math.min(1, elapsedRef.current / animationConfig.playDurationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    const arc = Math.sin(Math.PI * eased) * animationConfig.liftHeight;
    const from = movingCard.from.position;
    const to = movingCard.to.position;
    const x = from[0] + (to[0] - from[0]) * eased;
    const y = from[1] + (to[1] - from[1]) * eased + arc;
    const z = from[2] + (to[2] - from[2]) * eased;

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.set(
      movingCard.from.rotation[0],
      movingCard.from.rotation[1] + animationConfig.spinRadians * eased,
      movingCard.from.rotation[2],
    );

    if (t >= 1) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <group ref={groupRef} position={movingCard.from.position} rotation={movingCard.from.rotation}>
      <Card3D value={movingCard.value} faceUp />
    </group>
  );
}

function Table3D() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, -0.05, 0]} scale={[1.52, 0.1, 1]}>
        <cylinderGeometry args={[3.35, 3.55, 0.28, 96]} />
        <TextureMaterial slot={battleV2Assets.tableRim} />
      </mesh>
      <mesh receiveShadow position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.52, 0.92, 1]}>
        <circleGeometry args={[3.12, 96]} />
        <meshBasicMaterial color={battleV2Assets.table.color} />
      </mesh>
      <mesh receiveShadow position={[0, 0.105, 0]} scale={[1.46, 0.045, 0.92]}>
        <cylinderGeometry args={[3.18, 3.18, 0.08, 96]} />
        <TextureMaterial slot={battleV2Assets.table} />
      </mesh>
      <mesh receiveShadow position={[0, -0.22, 0]} scale={[1.72, 0.04, 1.08]}>
        <cylinderGeometry args={[3.5, 3.7, 0.08, 96]} />
        <meshStandardMaterial color="#11120f" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function CenterPiles({
  playedCards,
  graveyard,
}: {
  playedCards: Move[];
  graveyard: number[];
}) {
  const lastFieldCard = playedCards[playedCards.length - 1]?.card ?? 9;
  const lastGraveCard = graveyard[graveyard.length - 1] ?? 5;

  return (
    <group>
      <group position={pilePositions.deck} rotation={[0, -0.12, 0]}>
        {[0, 1, 2, 3, 4].map((cardIndex) => (
          <group key={cardIndex} position={[0, cardIndex * 0.018, cardIndex * -0.006]}>
            <Card3D value={0} faceUp={false} />
          </group>
        ))}
      </group>

      <group position={pilePositions.field}>
        {playedCards.length > 0 ? (
          playedCards.slice(-5).map((move, index) => (
            <group
              key={`${move.player}-${move.timestamp}-${index}`}
              position={[index * 0.025, index * 0.02, index * -0.018]}
              rotation={[0, index * 0.045, 0]}
            >
              <Card3D value={move.card} faceUp />
            </group>
          ))
        ) : (
          <Card3D value={lastFieldCard} faceUp />
        )}
      </group>

      <group position={pilePositions.graveyard} rotation={[0, 0.16, 0]}>
        {[0, 1, 2].map((cardIndex) => (
          <group key={cardIndex} position={[0, cardIndex * 0.018, cardIndex * 0.01]}>
            <Card3D value={cardIndex === 2 ? lastGraveCard : 0} faceUp={cardIndex === 2} />
          </group>
        ))}
      </group>
    </group>
  );
}

function PlayerName3D({
  name,
  pose,
  cucumbers,
  cards,
  active,
}: {
  name: string;
  pose: CardPose;
  cucumbers: number;
  cards: number;
  active: boolean;
}) {
  return (
    <group position={pose.position} rotation={pose.rotation} scale={pose.scale}>
      <Suspense fallback={null}>
        <Text
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.13}
          color={active ? '#fff2a6' : '#e7dcc6'}
          anchorX="center"
          anchorY="middle"
        >
          {`${name}  C:${cucumbers}  ${cards}枚`}
        </Text>
      </Suspense>
    </group>
  );
}

function OpponentHand({
  cards,
  position,
  rotation,
}: {
  cards: number[];
  position: Vec3;
  rotation: Euler3;
}) {
  return (
    <group position={position} rotation={rotation}>
      {cards.map((value, index) => {
        const pose = getOpponentCardPose(index, cards.length);
        return (
          <PosedCard
            key={`${value}-${index}`}
            pose={pose}
            card={{ id: `${value}-${index}`, value }}
            faceUp={false}
          />
        );
      })}
    </group>
  );
}

function PlayerHand({
  cards,
  selectedCardId,
  movingCardId,
  onSelectCard,
}: {
  cards: CardView[];
  selectedCardId: string | null;
  movingCardId: string | null;
  onSelectCard: (card: CardView) => void;
}) {
  return (
    <group position={[0, 0.24, 2.58]}>
      {cards.map((card, index) => {
        if (card.id === movingCardId) return null;
        const pose = getHandCardPose(index, cards.length, selectedCardId === card.id);
        return (
          <PosedCard
            key={card.id}
            pose={pose}
            card={card}
            faceUp
            selected={selectedCardId === card.id}
            onSelect={() => onSelectCard(card)}
          />
        );
      })}
    </group>
  );
}

function BattleSceneV2({
  state,
  selectedCardId,
  movingCard,
  playedCards,
  onSelectCard,
  onMoveComplete,
}: {
  state: GameState;
  selectedCardId: string | null;
  movingCard: MovingCard | null;
  playedCards: Move[];
  onSelectCard: (card: CardView) => void;
  onMoveComplete: () => void;
}) {
  const players = clampPlayers(state.players.length);
  const layout = seatLayouts[players];
  const playerCards = toCardViews(state.players[0]?.hand ?? []);

  return (
    <>
      <CameraRig />
      <SceneRenderLoop />
      <ambientLight intensity={0.38} />
      <directionalLight
        castShadow
        position={[2.8, 5.4, 4.2]}
        intensity={2.1}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
      />
      <pointLight position={[-2, 2.5, 3]} intensity={0.85} color="#ffe5b3" />
      <group rotation={[Math.PI * 0.36, 0, 0]} position={[0, -0.38, 0]} scale={0.56}>
        <Table3D />
        <Suspense fallback={null}>
          <CenterPiles playedCards={playedCards} graveyard={state.sharedGraveyard} />

          {state.players.map((player, index) => {
            const seat = layout[index];
            const isSelf = index === 0;
            const namePose: CardPose = {
              position: [
                seat.position[0],
                seat.position[1] + 0.02,
                seat.position[2] + (isSelf ? 0.55 : 0),
              ],
              rotation: seat.rotation,
              scale: isSelf ? 1.15 : 0.85,
            };

            return (
              <group key={index}>
                <PlayerName3D
                  name={isSelf ? 'あなた' : `CPU ${index}`}
                  pose={namePose}
                  cucumbers={player.cucumbers}
                  cards={player.hand.length}
                  active={state.currentPlayer === index}
                />
                {!isSelf ? (
                  <OpponentHand cards={player.hand} position={seat.position} rotation={seat.rotation} />
                ) : null}
              </group>
            );
          })}

          <PlayerHand
            cards={playerCards}
            selectedCardId={selectedCardId}
            movingCardId={movingCard?.id ?? null}
            onSelectCard={onSelectCard}
          />

          {movingCard ? <AnimatedCard movingCard={movingCard} onComplete={onMoveComplete} /> : null}
        </Suspense>
      </group>
    </>
  );
}

export default function BattleV2Page() {
  const [players, setPlayers] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [handCount, setHandCount] = useState(7);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [movingCard, setMovingCard] = useState<MovingCard | null>(null);
  const [playedCards, setPlayedCards] = useState<Move[]>([]);
  const [status, setStatus] = useState('カードを選択して、中央へ出す動きを確認できます。');

  const config = useMemo(() => createDemoConfig(players, handCount), [players, handCount]);
  const [state, setState] = useState<GameState>(() => createDemoState(createDemoConfig(4, 7)));

  const cardViews = useMemo(() => toCardViews(state.players[0]?.hand ?? []), [state]);
  const selectedCard = cardViews.find((card) => card.id === selectedCardId) ?? null;
  const legalMoves = useMemo(() => getLegalMoves(state, 0), [state]);
  const canPlay =
    Boolean(selectedCard) &&
    state.currentPlayer === 0 &&
    state.phase === 'AwaitMove' &&
    !movingCard &&
    selectedCard !== null &&
    legalMoves.includes(selectedCard.value);
  const selectedCardText = selectedCard ? `${selectedCard.value}` : '未選択';

  const resetDemo = (nextPlayers = players, nextHandCount = handCount) => {
    const nextConfig = createDemoConfig(nextPlayers, nextHandCount);
    setState(createDemoState(nextConfig));
    setSelectedCardId(null);
    setMovingCard(null);
    setPlayedCards([]);
    setStatus('リセットしました。カードを選択して動きを確認できます。');
  };

  const handlePlayersChange = (nextPlayers: 2 | 3 | 4 | 5 | 6) => {
    setPlayers(nextPlayers);
    resetDemo(nextPlayers, handCount);
  };

  const handleHandCountChange = (nextHandCount: number) => {
    const clamped = clampHandCount(nextHandCount);
    setHandCount(clamped);
    resetDemo(players, clamped);
  };

  const handleSelectCard = (card: CardView) => {
    if (state.currentPlayer !== 0 || movingCard) return;
    setSelectedCardId(card.id);
    setStatus(`${card.value} を選択中。少し浮いた状態になります。`);
  };

  const handlePlaySelectedCard = () => {
    if (!selectedCard || !canPlay) {
      setStatus('今はそのカードを出せません。リセットするか、別のカードを選んでください。');
      return;
    }

    const selectedIndex = cardViews.findIndex((card) => card.id === selectedCard.id);
    const from = getHandCardPose(selectedIndex, cardViews.length, true);
    const to: CardPose = {
      position: pilePositions.field,
      rotation: [0, 0.28, 0],
      scale: 1,
    };

    setMovingCard({
      id: selectedCard.id,
      value: selectedCard.value,
      from: {
        ...from,
        position: [from.position[0], from.position[1] + 0.24, from.position[2] + 2.58],
      },
      to,
    });
    setStatus('カードが手前から中央へ移動中です。');
  };

  const handleMoveComplete = () => {
    if (!movingCard) return;
    const rng = new SeededRng(config.seed);
    const move: Move = {
      player: 0,
      card: movingCard.value,
      timestamp: Date.now(),
      isDiscard: false,
    };
    const result = applyMove(state, move, config, rng);
    const nextState = result.success
      ? {
          ...result.newState,
          // V2検証では1枚出した後も座席と手札の見え方を保つため、解決へ進めず中央表示だけ確認する。
          phase: 'AwaitMove' as const,
        }
      : {
          ...state,
          players: state.players.map((player, index) =>
            index === 0
              ? {
                  ...player,
                  hand: player.hand.filter((_, handIndex) => {
                    const cardId = `${movingCard.value}-${handIndex}`;
                    return cardId !== movingCard.id;
                  }),
                }
              : player,
          ),
        };

    setPlayedCards((current) => [...current, move]);
    setState(nextState);
    setSelectedCardId(null);
    setMovingCard(null);
    setStatus('中央に着地しました。別条件は上のコントロールでリセットして確認できます。');
  };

  return (
    <main
      className={styles.page}
      style={
        {
          '--battle-v2-bg': battleV2Assets.backgroundImageUrl
            ? `url(${battleV2Assets.backgroundImageUrl})`
            : 'none',
          '--battle-v2-bg-color': battleV2Assets.backgroundColor,
        } as React.CSSProperties
      }
    >
      <div className={styles.background} aria-hidden="true" />

      <section className={styles.sceneLayer} aria-label="Battle Scene V2 3D試作">
        <Canvas
          shadows
          frameloop="always"
          dpr={[1, 1.75]}
          camera={{ fov: cameraConfig.fov, position: cameraConfig.position }}
          gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl, scene, camera }) => {
            const target = new Vector3(...cameraConfig.target);
            camera.lookAt(target);
            camera.updateMatrixWorld();
            camera.updateProjectionMatrix();
            gl.setClearColor(battleV2Assets.backgroundColor, 1);
            gl.render(scene, camera);
          }}
        >
          <BattleSceneV2
            state={state}
            selectedCardId={selectedCardId}
            movingCard={movingCard}
            playedCards={playedCards}
            onSelectCard={handleSelectCard}
            onMoveComplete={handleMoveComplete}
          />
        </Canvas>
      </section>

      <section className={styles.hudLayer} aria-label="Battle Scene V2 HUD">
        <header className={styles.topHud}>
          <div>
            <p className={styles.eyebrow}>Battle Scene V2 / R3F technical probe</p>
            <h1>5本のきゅうり 対局画面V2</h1>
          </div>
          <nav className={styles.navLinks} aria-label="比較リンク">
            <Link href="/cucumber/cpu/play">既存CPU対局</Link>
            <Link href="/home">ホーム</Link>
          </nav>
        </header>

        <aside className={styles.controlPanel} aria-label="V2検証コントロール">
          <div className={styles.panelHeader}>
            <span>V2検証</span>
            <strong>{players}人 / 初期{handCount}枚</strong>
          </div>

          <div className={styles.controlGroup}>
            <span>人数</span>
            <div className={styles.segmented}>
              {[2, 3, 4, 5, 6].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={players === value ? styles.selectedButton : undefined}
                  onClick={() => handlePlayersChange(value as 2 | 3 | 4 | 5 | 6)}
                >
                  {value}人
                </button>
              ))}
            </div>
          </div>

          <label className={styles.controlGroup}>
            <span>初期手札 {handCount}枚</span>
            <input
              type="range"
              min="1"
              max="15"
              value={handCount}
              onChange={(event) => handleHandCountChange(Number(event.target.value))}
            />
          </label>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={handlePlaySelectedCard}
              disabled={!canPlay}
            >
              出す
            </button>
            <button type="button" className={styles.secondaryAction} onClick={() => resetDemo()}>
              リセット
            </button>
          </div>

          <div className={styles.debugGrid} aria-label="V2表示状態">
            <span>選択</span>
            <strong>{selectedCardText}</strong>
            <span>合法手</span>
            <strong>{legalMoves.join(', ') || '-'}</strong>
            <span>場札</span>
            <strong>{playedCards.length}枚</strong>
          </div>

          <p className={styles.statusText} aria-live="polite">{status}</p>
        </aside>

        <footer className={styles.bottomHud}>
          <div>Round {state.currentRound}</div>
          <div>Trick {state.currentTrick}</div>
          <div>TIME 15</div>
          <div>{state.currentPlayer === 0 ? 'あなたの番' : `CPU ${state.currentPlayer} の番`}</div>
        </footer>
      </section>
    </main>
  );
}
