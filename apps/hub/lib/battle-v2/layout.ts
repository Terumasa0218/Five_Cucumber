export type Vec3 = [number, number, number];
export type Euler3 = [number, number, number];

export type SeatPose = {
  position: Vec3;
  rotation: Euler3;
  labelAnchor: 'front' | 'back' | 'left' | 'right';
};

export type CardPose = {
  position: Vec3;
  rotation: Euler3;
  scale: number;
};

const PI = Math.PI;

export const cameraConfig = {
  fov: 38,
  position: [0, 0, 8.6] as Vec3,
  target: [0, -0.1, 0] as Vec3,
};

export const animationConfig = {
  playDurationMs: 860,
  liftHeight: 1.15,
  spinRadians: PI * 0.42,
};

export const cardGeometry = {
  width: 0.56,
  height: 0.82,
  thickness: 0.045,
};

export const pilePositions = {
  deck: [-0.9, 0.18, 0] as Vec3,
  field: [0, 0.22, 0] as Vec3,
  graveyard: [0.9, 0.18, 0] as Vec3,
};

export const seatLayouts: Record<2 | 3 | 4 | 5 | 6, SeatPose[]> = {
  2: [
    { position: [0, 0.18, 3.15], rotation: [0, 0, 0], labelAnchor: 'front' },
    { position: [0, 0.18, -2.85], rotation: [0, PI, 0], labelAnchor: 'back' },
  ],
  3: [
    { position: [0, 0.18, 3.15], rotation: [0, 0, 0], labelAnchor: 'front' },
    { position: [-2.85, 0.18, -1.45], rotation: [0, PI * 0.72, 0], labelAnchor: 'left' },
    { position: [2.85, 0.18, -1.45], rotation: [0, -PI * 0.72, 0], labelAnchor: 'right' },
  ],
  4: [
    { position: [0, 0.18, 3.15], rotation: [0, 0, 0], labelAnchor: 'front' },
    { position: [-3.05, 0.18, 0], rotation: [0, PI / 2, 0], labelAnchor: 'left' },
    { position: [0, 0.18, -2.85], rotation: [0, PI, 0], labelAnchor: 'back' },
    { position: [3.05, 0.18, 0], rotation: [0, -PI / 2, 0], labelAnchor: 'right' },
  ],
  5: [
    { position: [0, 0.18, 3.15], rotation: [0, 0, 0], labelAnchor: 'front' },
    { position: [-3.05, 0.18, 1.0], rotation: [0, PI * 0.38, 0], labelAnchor: 'left' },
    { position: [-1.85, 0.18, -2.25], rotation: [0, PI * 0.78, 0], labelAnchor: 'back' },
    { position: [1.85, 0.18, -2.25], rotation: [0, -PI * 0.78, 0], labelAnchor: 'back' },
    { position: [3.05, 0.18, 1.0], rotation: [0, -PI * 0.38, 0], labelAnchor: 'right' },
  ],
  6: [
    { position: [0, 0.18, 3.15], rotation: [0, 0, 0], labelAnchor: 'front' },
    { position: [-3.05, 0.18, 1.25], rotation: [0, PI * 0.35, 0], labelAnchor: 'left' },
    { position: [-3.05, 0.18, -1.25], rotation: [0, PI * 0.65, 0], labelAnchor: 'left' },
    { position: [0, 0.18, -2.85], rotation: [0, PI, 0], labelAnchor: 'back' },
    { position: [3.05, 0.18, -1.25], rotation: [0, -PI * 0.65, 0], labelAnchor: 'right' },
    { position: [3.05, 0.18, 1.25], rotation: [0, -PI * 0.35, 0], labelAnchor: 'right' },
  ],
};

export function clampPlayers(players: number): 2 | 3 | 4 | 5 | 6 {
  if (players <= 2) return 2;
  if (players >= 6) return 6;
  return players as 2 | 3 | 4 | 5 | 6;
}

export function clampHandCount(count: number): number {
  if (!Number.isFinite(count)) return 7;
  return Math.min(15, Math.max(1, Math.round(count)));
}

export function getHandCardPose(index: number, count: number, selected: boolean): CardPose {
  const mid = (count - 1) / 2;
  const compact = Math.max(0, count - 7);
  const spacing = Math.max(0.23, 0.46 - compact * 0.018);
  const arcDepth = Math.min(0.34, count * 0.014);
  const fan = Math.min(0.42, count * 0.022);
  const offset = index - mid;
  const normalized = count <= 1 ? 0 : offset / mid;
  const z = selected ? 0.2 : -Math.abs(normalized) * arcDepth;

  return {
    position: [offset * spacing, selected ? 0.28 : 0.06, z + (selected ? 0.12 : 0)],
    rotation: [0, -normalized * fan, 0],
    scale: selected ? 1.1 : Math.max(0.78, 1 - compact * 0.018),
  };
}

export function getOpponentCardPose(index: number, count: number): CardPose {
  const mid = (count - 1) / 2;
  const spacing = Math.max(0.14, 0.25 - Math.max(0, count - 7) * 0.008);
  return {
    position: [(index - mid) * spacing, 0.04, 0],
    rotation: [0, 0, 0],
    scale: 0.55,
  };
}

export function createDemoHand(count: number): number[] {
  const values = [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6, 3];
  return values.slice(0, clampHandCount(count)).sort((a, b) => a - b);
}
