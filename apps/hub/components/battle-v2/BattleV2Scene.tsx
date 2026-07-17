'use client';

import { Text } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { TextureLoader, Vector3 } from 'three';
import type { Group } from 'three';
import type { GameState, Move } from '@/lib/game-core';
import { battleV2Assets, type BattleV2AssetSlot } from '@/lib/battle-v2/assets';
import {
  animationConfig,
  cameraConfig,
  cardGeometry,
  clampPlayers,
  getHandCardPose,
  getOpponentCardPose,
  pilePositions,
  seatLayouts,
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

export function toBattleV2CardViews(hand: number[]): BattleV2CardView[] {
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
  card: BattleV2CardView;
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
  fieldCard,
  hiddenPlayedMoveKey,
}: {
  playedCards: Move[];
  graveyard: number[];
  fieldCard: number | null;
  hiddenPlayedMoveKey?: string | null;
}) {
  const visiblePlayedCards = hiddenPlayedMoveKey
    ? playedCards.filter(move => `${move.player}-${move.timestamp}` !== hiddenPlayedMoveKey)
    : playedCards;
  const lastFieldCard = visiblePlayedCards[visiblePlayedCards.length - 1]?.card ?? fieldCard ?? 9;
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
  cards: BattleV2CardView[];
  selectedCardId: string | null;
  movingCardId: string | null;
  onSelectCard: (card: BattleV2CardView) => void;
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

function BattleSceneContents({
  state,
  names,
  selectedCardId,
  movingCard,
  playedCards,
  hiddenPlayedMoveKey,
  onSelectCard,
  onMoveComplete,
}: {
  state: GameState;
  names: string[];
  selectedCardId: string | null;
  movingCard: BattleV2MovingCard | null;
  playedCards: Move[];
  hiddenPlayedMoveKey: string | null;
  onSelectCard: (card: BattleV2CardView) => void;
  onMoveComplete: () => void;
}) {
  const players = clampPlayers(state.players.length);
  const layout = seatLayouts[players];
  const playerCards = toBattleV2CardViews(state.players[0]?.hand ?? []);

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
          <CenterPiles
            playedCards={playedCards}
            graveyard={state.sharedGraveyard}
            fieldCard={state.fieldCard}
            hiddenPlayedMoveKey={hiddenPlayedMoveKey}
          />

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
                  name={names[index] ?? (isSelf ? 'あなた' : `CPU ${index}`)}
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

export function BattleV2Scene({
  state,
  names,
  selectedCardId = null,
  movingCard = null,
  playedCards,
  hiddenPlayedMoveKey = null,
  onSelectCard,
  onMoveComplete = () => {},
}: {
  state: GameState;
  names: string[];
  selectedCardId?: string | null;
  movingCard?: BattleV2MovingCard | null;
  playedCards: Move[];
  hiddenPlayedMoveKey?: string | null;
  onSelectCard: (card: BattleV2CardView) => void;
  onMoveComplete?: () => void;
}) {
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
        selectedCardId={selectedCardId}
        movingCard={movingCard}
        playedCards={playedCards}
        hiddenPlayedMoveKey={hiddenPlayedMoveKey}
        onSelectCard={onSelectCard}
        onMoveComplete={onMoveComplete}
      />
    </Canvas>
  );
}
