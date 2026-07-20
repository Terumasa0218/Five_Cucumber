'use client';

import { Text } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Shape, TextureLoader, Vector3 } from 'three';
import type { Group } from 'three';
import type { GameState, MarketState, Move } from '@/lib/game-core';
import { battleV2Assets, type BattleV2AssetSlot } from '@/lib/battle-v2/assets';
import {
  animationConfig,
  cameraConfig,
  cardGeometry,
  centerPileScale,
  clampPlayers,
  getHandCardPose,
  getOpponentCardPose,
  pilePositions,
  playerHandOrigin,
  sceneConfig,
  screenFacingRotation,
  seatLayouts,
  tableCardY,
  type CardPose,
  type Euler3,
  type Vec3,
} from '@/lib/battle-v2/layout';

export type BattleV2CardView = {
  id: string;
  value: number;
};

export type BattleV2MovingCard = {
  id: string;
  value: number;
  actorLabel?: string;
  from: CardPose;
  to: CardPose;
};

type CardVisualStatus = 'normal' | 'playable' | 'discard' | 'disabled';

export type BattleV2MarketStage =
  | 'select'
  | 'submit'
  | 'reveal'
  | 'order'
  | 'choose'
  | 'complete';

export type BattleV2MarketView = {
  state: MarketState;
  stage: BattleV2MarketStage;
  selectedBidId?: string | null;
  currentPlayer?: number | null;
  canTakeCard?: boolean;
  onSelectBid?: (card: BattleV2CardView) => void;
  onTakeCard?: (card: number) => void;
};

export function toBattleV2CardViews(hand: number[]): BattleV2CardView[] {
  return hand.map((value, index) => ({ id: `${value}-${index}`, value }));
}

function mixNumber(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function mixVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return [
    mixNumber(from[0], to[0], t),
    mixNumber(from[1], to[1], t),
    mixNumber(from[2], to[2], t),
  ];
}

function mixEuler(from: Euler3, to: Euler3, t: number): Euler3 {
  return [
    mixNumber(from[0], to[0], t),
    mixNumber(from[1], to[1], t),
    mixNumber(from[2], to[2], t),
  ];
}

function offsetFromTableCenter(position: Vec3, distance: number, yOffset = 0): Vec3 {
  const length = Math.hypot(position[0], position[2]) || 1;
  return [
    position[0] + (position[0] / length) * distance,
    position[1] + yOffset,
    position[2] + (position[2] / length) * distance,
  ];
}

function withY(position: Vec3, y: number): Vec3 {
  return [position[0], y, position[2]];
}

function clampViewerIndex(viewerIndex: number, players: number): number {
  if (!Number.isFinite(viewerIndex)) return 0;
  return Math.min(Math.max(0, Math.round(viewerIndex)), Math.max(0, players - 1));
}

function marketStageAtLeast(stage: BattleV2MarketStage, target: BattleV2MarketStage): boolean {
  const order: BattleV2MarketStage[] = [
    'select',
    'submit',
    'reveal',
    'order',
    'choose',
    'complete',
  ];
  return order.indexOf(stage) >= order.indexOf(target);
}

function removeOneCardValue(hand: number[], card: number): number[] {
  const next = [...hand];
  const index = next.indexOf(card);
  if (index >= 0) {
    next.splice(index, 1);
  }
  return next;
}

function getMarketDisplayHands(market: BattleV2MarketView): number[][] {
  if (market.state.phase !== 'Bidding' || !marketStageAtLeast(market.stage, 'submit')) {
    return market.state.hands;
  }

  return market.state.hands.map((hand, player) => {
    const bid = market.state.bids[player];
    return bid && bid.card !== null ? removeOneCardValue(hand, bid.card) : hand;
  });
}

function getLogicalIndex(visualIndex: number, viewerIndex: number, players: number): number {
  return (viewerIndex + visualIndex) % players;
}

function getVisualIndex(logicalIndex: number, viewerIndex: number, players: number): number {
  return (logicalIndex - viewerIndex + players) % players;
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

function createRoundedRectShape(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function RoundedCardBody({ color }: { color: string }) {
  const shape = useMemo(
    () => createRoundedRectShape(cardGeometry.width, cardGeometry.height, 0.055),
    []
  );
  const extrudeSettings = useMemo(
    () => ({
      depth: cardGeometry.thickness,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.007,
      bevelThickness: 0.002,
    }),
    []
  );

  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, cardGeometry.thickness + 0.002, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial color={color} roughness={0.84} metalness={0} />
    </mesh>
  );
}

function RoundedCardSurface({ slot }: { slot: BattleV2AssetSlot }) {
  const shape = useMemo(
    () => createRoundedRectShape(cardGeometry.width * 0.94, cardGeometry.height * 0.94, 0.046),
    []
  );

  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, cardGeometry.thickness + 0.008, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <shapeGeometry args={[shape]} />
      <TextureMaterial slot={slot} />
    </mesh>
  );
}

function RoundedCardOverlay({ color, opacity }: { color: string; opacity: number }) {
  const shape = useMemo(
    () => createRoundedRectShape(cardGeometry.width * 0.94, cardGeometry.height * 0.94, 0.046),
    []
  );

  return (
    <mesh
      position={[0, cardGeometry.thickness + 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
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
  }, [camera, target]);

  return null;
}

function CardStatusOutline({ color, opacity }: { color: string; opacity: number }) {
  const y = cardGeometry.thickness + 0.018;
  const width = cardGeometry.width * 0.99;
  const height = cardGeometry.height * 0.99;
  const strip = 0.024;

  return (
    <group>
      <mesh position={[0, y, -height / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, strip]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[0, y, height / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, strip]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[-width / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[strip, height]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[width / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[strip, height]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Card3D({
  value,
  faceUp,
  selected,
  status = 'normal',
  onSelect,
}: {
  value: number;
  faceUp: boolean;
  selected?: boolean;
  status?: CardVisualStatus;
  onSelect?: () => void;
}) {
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect?.();
  };
  const isDisabled = status === 'disabled';
  const outlineColor =
    status === 'playable'
      ? '#42a8ff'
      : status === 'discard'
        ? '#ff3647'
        : selected
          ? '#f3d36a'
          : null;
  const faceTextColor = isDisabled ? '#7e827b' : value === 15 ? '#b03a2e' : '#1f1b13';
  const sideColor = isDisabled ? '#555a51' : battleV2Assets.cardSide.color;

  return (
    <group onPointerDown={handlePointerDown}>
      <RoundedCardBody color={sideColor} />
      <RoundedCardSurface slot={faceUp ? battleV2Assets.cardFace : battleV2Assets.cardBack} />

      {faceUp ? (
        <Suspense fallback={null}>
          <Text
            position={[0, cardGeometry.thickness + 0.011, -0.08]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.24}
            color={faceTextColor}
            anchorX="center"
            anchorY="middle"
          >
            {String(value)}
          </Text>
          <Text
            position={[0, cardGeometry.thickness + 0.012, 0.22]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.08}
            color={isDisabled ? '#8a8d83' : '#267842'}
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

      {outlineColor ? (
        <CardStatusOutline
          color={outlineColor}
          opacity={status === 'discard' ? 0.96 : 0.82}
        />
      ) : null}

      {isDisabled ? (
        <RoundedCardOverlay color="#6c7168" opacity={0.58} />
      ) : null}

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
  status,
  onSelect,
}: {
  pose: CardPose;
  card: BattleV2CardView;
  faceUp: boolean;
  selected?: boolean;
  status?: CardVisualStatus;
  onSelect?: () => void;
}) {
  return (
    <group position={pose.position} rotation={pose.rotation} scale={pose.scale}>
      <Card3D
        value={card.value}
        faceUp={faceUp}
        selected={selected}
        status={status}
        onSelect={onSelect}
      />
    </group>
  );
}

function AnimatedCard({
  movingCard,
  onComplete,
}: {
  movingCard: BattleV2MovingCard;
  onComplete: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current || completedRef.current) return;
    elapsedRef.current += delta * 1000;
    const t = Math.min(1, elapsedRef.current / animationConfig.playDurationMs);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const position = mixVec3(movingCard.from.position, movingCard.to.position, eased);
    const rotation = mixEuler(movingCard.from.rotation, movingCard.to.rotation, eased);

    groupRef.current.position.set(...position);
    groupRef.current.rotation.set(...rotation);

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

function getMarketStageTitle(stage: BattleV2MarketStage): string {
  if (stage === 'select') return '交換カードを選択';
  if (stage === 'submit') return '伏せ札を提出';
  if (stage === 'reveal') return '一斉公開';
  if (stage === 'order') return '交換順';
  if (stage === 'choose') return '市場から取得';
  return 'ゲーム開始';
}

function MarketStageTitle3D({ stage }: { stage: BattleV2MarketStage }) {
  return (
    <group position={[0, tableCardY + 0.06, -1.48]} rotation={screenFacingRotation}>
      <mesh renderOrder={50} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 0.42]} />
        <meshBasicMaterial
          color="#111a13"
          transparent
          opacity={0.86}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Suspense fallback={null}>
        <Text
          renderOrder={51}
          position={[0, 0.052, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.19}
          color="#f7edcd"
          anchorX="center"
          anchorY="middle"
          material-depthTest={false}
          material-depthWrite={false}
        >
          {getMarketStageTitle(stage)}
        </Text>
      </Suspense>
    </group>
  );
}

function MarketCardRow3D({
  cards,
  canTake,
  onTakeCard,
}: {
  cards: number[];
  canTake: boolean;
  onTakeCard?: (card: number) => void;
}) {
  const spacing = cards.length <= 1 ? 0 : Math.min(0.84, 4.8 / Math.max(1, cards.length - 1));
  const mid = (cards.length - 1) / 2;

  return (
    <group position={[0, tableCardY + 0.036, -0.62]} scale={1.06}>
      {cards.map((value, index) => (
        <group
          key={`market-card-${value}-${index}`}
          position={[(index - mid) * spacing, canTake ? 0.025 : 0, 0]}
          rotation={[0, (index - mid) * 0.025, 0]}
        >
          <Card3D
            value={value}
            faceUp
            status={canTake ? 'playable' : 'normal'}
            onSelect={canTake ? () => onTakeCard?.(value) : undefined}
          />
        </group>
      ))}
    </group>
  );
}

function MarketPassMarker({ label = 'PASS' }: { label?: string }) {
  return (
    <group>
      <mesh position={[0, cardGeometry.thickness + 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cardGeometry.width * 1.1, cardGeometry.height * 0.48]} />
        <meshBasicMaterial color="#1c261d" transparent opacity={0.92} depthWrite={false} />
      </mesh>
      <Suspense fallback={null}>
        <Text
          position={[0, cardGeometry.thickness + 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.12}
          color="#c9bc8c"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Suspense>
    </group>
  );
}

function MarketOrderLabel({ rank }: { rank: number }) {
  return (
    <group position={[0, cardGeometry.thickness + 0.034, -0.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.58, 0.22]} />
        <meshBasicMaterial color="#f1c84b" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Suspense fallback={null}>
        <Text
          position={[0, 0.016, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.105}
          color="#15130c"
          anchorX="center"
          anchorY="middle"
          material-depthWrite={false}
        >
          {`${rank}番`}
        </Text>
      </Suspense>
    </group>
  );
}

function MarketSubmittedCard({
  value,
  faceUp,
  targetPosition,
  targetRotation,
  scale,
  animateFrom,
  orderRank,
}: {
  value: number | null;
  faceUp: boolean;
  targetPosition: Vec3;
  targetRotation: Euler3;
  scale: number;
  animateFrom?: CardPose | null;
  orderRank?: number | null;
}) {
  const groupRef = useRef<Group>(null);
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);

  useLayoutEffect(() => {
    elapsedRef.current = 0;
    completedRef.current = false;
    if (!groupRef.current) return;
    const startPosition = animateFrom?.position ?? targetPosition;
    const startRotation = animateFrom?.rotation ?? targetRotation;
    groupRef.current.position.set(...startPosition);
    groupRef.current.rotation.set(...startRotation);
  }, [animateFrom, targetPosition, targetRotation]);

  useFrame((_, delta) => {
    if (!groupRef.current || completedRef.current || !animateFrom) return;
    elapsedRef.current += delta * 1000;
    const t = Math.min(1, elapsedRef.current / 560);
    const eased = 1 - Math.pow(1 - t, 3);
    const position = mixVec3(animateFrom.position, targetPosition, eased);
    const rotation = mixEuler(animateFrom.rotation, targetRotation, eased);
    groupRef.current.position.set(...position);
    groupRef.current.rotation.set(...rotation);

    if (t >= 1) {
      completedRef.current = true;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {value === null ? <MarketPassMarker /> : <Card3D value={value} faceUp={faceUp} />}
      {orderRank ? <MarketOrderLabel rank={orderRank} /> : null}
    </group>
  );
}

function getMarketBidPose(seatPosition: Vec3, isSelf: boolean): Vec3 {
  if (isSelf) {
    return [seatPosition[0] * 0.34, tableCardY + 0.055, 1.12];
  }
  return [seatPosition[0] * 0.7, tableCardY + 0.055, seatPosition[2] * 0.64];
}

function getMarketBidAnimateFrom(seatPosition: Vec3, isSelf: boolean): CardPose {
  return {
    position: isSelf
      ? [playerHandOrigin[0], playerHandOrigin[1], playerHandOrigin[2] - 0.18]
      : [seatPosition[0], tableCardY + 0.1, seatPosition[2]],
    rotation: isSelf ? screenFacingRotation : [0, 0, 0],
    scale: 1,
  };
}

function MarketBids3D({
  market,
  layout,
  viewerIndex,
  playerCount,
}: {
  market: BattleV2MarketView;
  layout: typeof seatLayouts[2];
  viewerIndex: number;
  playerCount: number;
}) {
  const shouldShowSubmitted = marketStageAtLeast(market.stage, 'submit');
  const faceUp = marketStageAtLeast(market.stage, 'reveal');
  const showOrder = marketStageAtLeast(market.stage, 'order');

  if (!shouldShowSubmitted) return null;

  return (
    <group>
      {market.state.bids.map((bid, logicalIndex) => {
        if (!bid) return null;
        const visualIndex = getVisualIndex(logicalIndex, viewerIndex, playerCount);
        const seat = layout[visualIndex];
        if (!seat) return null;
        const isSelf = logicalIndex === viewerIndex;
        const targetPosition = getMarketBidPose(seat.position, isSelf);
        const orderIndex = market.state.exchangeOrder.findIndex(
          turn => turn.player === logicalIndex
        );
        const isCurrent = market.stage === 'choose' && market.currentPlayer === logicalIndex;
        const scale = isSelf ? 0.94 : 0.76;

        return (
          <group key={`market-bid-${logicalIndex}`}>
            <MarketSubmittedCard
              value={bid.card}
              faceUp={faceUp}
              targetPosition={targetPosition}
              targetRotation={seat.rotation}
              scale={isCurrent ? scale * 1.08 : scale}
              animateFrom={
                market.stage === 'submit' ? getMarketBidAnimateFrom(seat.position, isSelf) : null
              }
              orderRank={showOrder && orderIndex >= 0 ? orderIndex + 1 : null}
            />
          </group>
        );
      })}
    </group>
  );
}

function MarketPlayerHand({
  cards,
  selectedCardId,
  canSelect,
  onSelectCard,
}: {
  cards: BattleV2CardView[];
  selectedCardId: string | null;
  canSelect: boolean;
  onSelectCard?: (card: BattleV2CardView) => void;
}) {
  return (
    <group position={playerHandOrigin} rotation={screenFacingRotation}>
      {cards.map((card, index) => {
        const pose = getHandCardPose(index, cards.length, selectedCardId === card.id);
        const status: CardVisualStatus = canSelect ? 'playable' : 'normal';
        return (
          <PosedCard
            key={card.id}
            pose={pose}
            card={card}
            faceUp
            selected={selectedCardId === card.id}
            status={status}
            onSelect={canSelect ? () => onSelectCard?.(card) : undefined}
          />
        );
      })}
    </group>
  );
}

function MarketScene3D({
  market,
  layout,
  viewerIndex,
  playerCount,
}: {
  market: BattleV2MarketView;
  layout: typeof seatLayouts[2];
  viewerIndex: number;
  playerCount: number;
}) {
  return (
    <group>
      <MarketStageTitle3D stage={market.stage} />
      <MarketCardRow3D
        cards={market.state.market}
        canTake={market.stage === 'choose' && !!market.canTakeCard}
        onTakeCard={market.onTakeCard}
      />
      <MarketBids3D
        market={market}
        layout={layout}
        viewerIndex={viewerIndex}
        playerCount={playerCount}
      />
    </group>
  );
}

function Table3D() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, -0.05, 0]} scale={[1.92, 0.08, 1.02]}>
        <cylinderGeometry args={[3.35, 3.55, 0.28, 96]} />
        <TextureMaterial slot={battleV2Assets.tableRim} />
      </mesh>
      <mesh receiveShadow position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.9, 0.9, 1]}>
        <circleGeometry args={[3.12, 96]} />
        <meshStandardMaterial color={battleV2Assets.table.color} roughness={0.92} metalness={0} />
      </mesh>
      <mesh receiveShadow position={[0, 0.182, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.82, 0.85, 1]}>
        <ringGeometry args={[2.92, 3.02, 128]} />
        <meshBasicMaterial color="#d1a354" transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh receiveShadow position={[0, 0.105, 0]} scale={[1.82, 0.035, 0.9]}>
        <cylinderGeometry args={[3.18, 3.18, 0.08, 96]} />
        <TextureMaterial slot={battleV2Assets.table} />
      </mesh>
      <mesh receiveShadow position={[0, -0.2, 0]} scale={[2.08, 0.035, 1.08]}>
        <cylinderGeometry args={[3.5, 3.7, 0.08, 96]} />
        <meshStandardMaterial color="#11120f" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function CenterPiles({
  playedCards,
  graveyard,
  fieldCard,
  hiddenPlayedMoveKey,
  showdownMode,
  layout,
  viewerIndex,
  trickWinner,
}: {
  playedCards: Move[];
  graveyard: number[];
  fieldCard: number | null;
  hiddenPlayedMoveKey?: string | null;
  showdownMode: boolean;
  layout: typeof seatLayouts[2];
  viewerIndex: number;
  trickWinner: number | null;
}) {
  const visiblePlayedCards = hiddenPlayedMoveKey
    ? playedCards.filter(move => `${move.player}-${move.timestamp}` !== hiddenPlayedMoveKey)
    : playedCards;
  const lastGraveCard = graveyard[graveyard.length - 1] ?? null;

  if (showdownMode && visiblePlayedCards.length > 0) {
    return (
      <group>
        {visiblePlayedCards.map((move, index) => {
          const playerCount = layout.length;
          const seat = layout[getVisualIndex(move.player, viewerIndex, playerCount)];
          const fallbackAngle = (index / Math.max(1, visiblePlayedCards.length)) * Math.PI * 2;
          const seatPosition = seat?.position ?? [Math.sin(fallbackAngle), 0, Math.cos(fallbackAngle)];
          const position: Vec3 = [
            seatPosition[0] * 0.34,
            pilePositions.field[1] + index * 0.012,
            seatPosition[2] * 0.34,
          ];
          const rotation: Euler3 = [0, seat?.rotation[1] ?? fallbackAngle, 0];

          return (
            <group
              key={`showdown-${move.player}-${move.timestamp}-${index}`}
              position={position}
              rotation={rotation}
              scale={move.player === trickWinner ? 1.08 : 1}
            >
              <Card3D
                value={move.card}
                faceUp
                status={move.player === trickWinner ? 'playable' : 'normal'}
              />
            </group>
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <group position={pilePositions.deck} rotation={[0, -0.12, 0]} scale={centerPileScale}>
        {[0, 1, 2, 3, 4].map((cardIndex) => (
          <group key={cardIndex} position={[0, cardIndex * 0.018, cardIndex * -0.006]}>
            <Card3D value={0} faceUp={false} />
          </group>
        ))}
      </group>

      {visiblePlayedCards.length > 0 || fieldCard !== null ? (
        <group position={pilePositions.field} scale={centerPileScale}>
          {visiblePlayedCards.length > 0 ? (
            visiblePlayedCards.slice(-5).map((move, index) => (
              <group
                key={`${move.player}-${move.timestamp}-${index}`}
                position={[index * 0.025, index * 0.02, index * -0.018]}
                rotation={[0, index * 0.045, 0]}
              >
                <Card3D value={move.card} faceUp />
              </group>
            ))
          ) : fieldCard !== null ? (
            <Card3D value={fieldCard} faceUp />
          ) : null}
        </group>
      ) : null}

      {lastGraveCard !== null ? (
        <group position={pilePositions.graveyard} rotation={[0, 0.16, 0]} scale={centerPileScale}>
          {[0, 1, 2].map((cardIndex) => (
            <group key={cardIndex} position={[0, cardIndex * 0.018, cardIndex * 0.01]}>
              <Card3D value={cardIndex === 2 ? lastGraveCard : 0} faceUp={cardIndex === 2} />
            </group>
          ))}
        </group>
      ) : null}
    </group>
  );
}

function PlayerName3D({
  name,
  pose,
  cucumbers,
  cards,
  active,
  compact = false,
}: {
  name: string;
  pose: CardPose;
  cucumbers: number;
  cards: number;
  active: boolean;
  compact?: boolean;
}) {
  const activeSize: [number, number] = compact ? [1.28, 0.38] : [1.74, 0.5];
  const panelSize: [number, number] = compact ? [1.12, 0.26] : [1.5, 0.32];
  const fontSize = compact ? 0.105 : 0.13;

  return (
    <group position={pose.position} rotation={pose.rotation} scale={pose.scale}>
      {active ? (
        <mesh renderOrder={42} position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={activeSize} />
          <meshBasicMaterial
            color="#f1c84b"
            transparent
            opacity={0.86}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <mesh renderOrder={43} position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={panelSize} />
        <meshStandardMaterial
          color={active ? '#f4d66d' : '#152119'}
          emissive={active ? '#d7a71f' : '#000000'}
          emissiveIntensity={active ? 0.28 : 0}
          depthTest={false}
          depthWrite={false}
          roughness={0.7}
          metalness={0.01}
        />
      </mesh>
      <Suspense fallback={null}>
        <Text
          renderOrder={44}
          position={[0, 0.07, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={fontSize}
          color={active ? '#11130c' : '#e7dcc6'}
          anchorX="center"
          anchorY="middle"
          material-depthTest={false}
          material-depthWrite={false}
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
  legalMoves,
  isPlayerTurn,
  fieldCard,
  onSelectCard,
}: {
  cards: BattleV2CardView[];
  selectedCardId: string | null;
  movingCardId: string | null;
  legalMoves: number[];
  isPlayerTurn: boolean;
  fieldCard: number | null;
  onSelectCard: (card: BattleV2CardView) => void;
}) {
  const legalMoveValues = useMemo(() => new Set(legalMoves), [legalMoves]);
  const minCard = useMemo(
    () => (cards.length > 0 ? Math.min(...cards.map(card => card.value)) : null),
    [cards]
  );

  const getStatus = (card: BattleV2CardView): CardVisualStatus => {
    if (!isPlayerTurn) return 'disabled';
    const isDiscardCandidate =
      fieldCard !== null && minCard !== null && card.value === minCard && card.value < fieldCard;
    if (isDiscardCandidate && legalMoveValues.has(card.value)) return 'discard';
    if (!legalMoveValues.has(card.value)) return 'disabled';
    return 'playable';
  };

  return (
    <group position={playerHandOrigin} rotation={screenFacingRotation}>
      {cards.map((card, index) => {
        if (card.id === movingCardId) return null;
        const pose = getHandCardPose(index, cards.length, selectedCardId === card.id);
        const status = getStatus(card);
        return (
          <PosedCard
            key={card.id}
            pose={pose}
            card={card}
            faceUp
            selected={selectedCardId === card.id}
            status={status}
            onSelect={status === 'disabled' ? undefined : () => onSelectCard(card)}
          />
        );
      })}
    </group>
  );
}

function BattleSceneContents({
  state,
  names,
  viewerIndex,
  selectedCardId,
  movingCard,
  playedCards,
  hiddenPlayedMoveKey,
  legalMoves,
  showdownMode,
  trickWinner,
  market,
  onSelectCard,
  onMoveComplete,
}: {
  state: GameState;
  names: string[];
  viewerIndex: number;
  selectedCardId: string | null;
  movingCard: BattleV2MovingCard | null;
  playedCards: Move[];
  hiddenPlayedMoveKey: string | null;
  legalMoves: number[];
  showdownMode: boolean;
  trickWinner: number | null;
  market: BattleV2MarketView | null;
  onSelectCard: (card: BattleV2CardView) => void;
  onMoveComplete: () => void;
}) {
  const players = clampPlayers(state.players.length);
  const layout = seatLayouts[players];
  const logicalPlayerCount = Math.max(1, state.players.length);
  const safeViewerIndex = clampViewerIndex(viewerIndex, logicalPlayerCount);
  const marketDisplayHands = market ? getMarketDisplayHands(market) : null;
  const playerCards = toBattleV2CardViews(
    marketDisplayHands?.[safeViewerIndex] ?? state.players[safeViewerIndex]?.hand ?? []
  );
  const isPlayerTurn = state.currentPlayer === safeViewerIndex && state.phase === 'AwaitMove';

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.38} />
      <directionalLight
        castShadow
        position={[2.8, 5.4, 4.2]}
        intensity={2.1}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
      />
      <pointLight position={[-2, 2.5, 3]} intensity={0.85} color="#ffe5b3" />
      <group
        rotation={sceneConfig.rotation}
        position={sceneConfig.position}
        scale={sceneConfig.scale}
      >
        <Table3D />
        <Suspense fallback={null}>
          {market ? (
            <MarketScene3D
              market={market}
              layout={layout}
              viewerIndex={safeViewerIndex}
              playerCount={logicalPlayerCount}
            />
          ) : (
            <CenterPiles
              playedCards={playedCards}
              graveyard={state.sharedGraveyard}
              fieldCard={state.fieldCard}
              hiddenPlayedMoveKey={hiddenPlayedMoveKey}
              showdownMode={showdownMode}
              layout={layout}
              viewerIndex={safeViewerIndex}
              trickWinner={trickWinner}
            />
          )}

          {layout.map((seat, visualIndex) => {
            const logicalIndex = getLogicalIndex(visualIndex, safeViewerIndex, logicalPlayerCount);
            const player = state.players[logicalIndex];
            const marketHand = marketDisplayHands?.[logicalIndex];
            if (!player) return null;
            const isSelf = logicalIndex === safeViewerIndex;
            const opponentHandPosition = isSelf
              ? seat.position
              : withY(offsetFromTableCenter(seat.position, -0.42), tableCardY);
            const opponentNameDistance =
              seat.labelAnchor === 'left' || seat.labelAnchor === 'right' ? 0.54 : 0.82;
            const namePose: CardPose = {
              position: isSelf
                ? [seat.position[0], seat.position[1] + 0.04, seat.position[2] + 0.9]
                : offsetFromTableCenter(seat.position, opponentNameDistance, 0.1),
              rotation: screenFacingRotation,
              scale: isSelf ? 1.02 : 0.82,
            };

            return (
              <group key={logicalIndex}>
                <PlayerName3D
                  name={names[logicalIndex] ?? (isSelf ? 'あなた' : `P${logicalIndex + 1}`)}
                  pose={namePose}
                  cucumbers={player.cucumbers}
                  cards={marketHand?.length ?? player.hand.length}
                  active={
                    market
                      ? (market.stage === 'select' && isSelf) ||
                        (market.stage === 'choose' && market.currentPlayer === logicalIndex)
                      : state.phase === 'AwaitMove' && state.currentPlayer === logicalIndex
                  }
                  compact={!isSelf}
                />
                {!isSelf ? (
                  <OpponentHand
                    cards={marketHand ?? player.hand}
                    position={opponentHandPosition}
                    rotation={seat.rotation}
                  />
                ) : null}
              </group>
            );
          })}

          {market ? (
            <MarketPlayerHand
              cards={playerCards}
              selectedCardId={market.selectedBidId ?? null}
              canSelect={market.stage === 'select' && market.state.phase === 'Bidding'}
              onSelectCard={market.onSelectBid}
            />
          ) : (
            <PlayerHand
              cards={playerCards}
              selectedCardId={selectedCardId}
              movingCardId={movingCard?.id ?? null}
              legalMoves={legalMoves}
              isPlayerTurn={isPlayerTurn}
              fieldCard={state.fieldCard}
              onSelectCard={onSelectCard}
            />
          )}

          {movingCard ? <AnimatedCard movingCard={movingCard} onComplete={onMoveComplete} /> : null}
        </Suspense>
      </group>
    </>
  );
}

export type BattleV2SceneProps = {
  state: GameState;
  names: string[];
  viewerIndex?: number;
  selectedCardId?: string | null;
  movingCard?: BattleV2MovingCard | null;
  playedCards: Move[];
  hiddenPlayedMoveKey?: string | null;
  legalMoves?: number[];
  showdownMode?: boolean;
  trickWinner?: number | null;
  market?: BattleV2MarketView | null;
  onSelectCard: (card: BattleV2CardView) => void;
  onMoveComplete?: () => void;
};

export function BattleV2Scene({
  state,
  names,
  viewerIndex = 0,
  selectedCardId = null,
  movingCard = null,
  playedCards,
  hiddenPlayedMoveKey = null,
  legalMoves = [],
  showdownMode = false,
  trickWinner = null,
  market = null,
  onSelectCard,
  onMoveComplete = () => {},
}: BattleV2SceneProps) {
  return (
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
      <BattleSceneContents
        state={state}
        names={names}
        viewerIndex={viewerIndex}
        selectedCardId={selectedCardId}
        movingCard={movingCard}
        playedCards={playedCards}
        hiddenPlayedMoveKey={hiddenPlayedMoveKey}
        legalMoves={legalMoves}
        showdownMode={showdownMode}
        trickWinner={trickWinner}
        market={market}
        onSelectCard={onSelectCard}
        onMoveComplete={onMoveComplete}
      />
    </Canvas>
  );
}
