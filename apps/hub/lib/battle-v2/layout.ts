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
  fov: 40,
  position: [0, 7.15, 7.2] as Vec3,
  target: [0, 0.1, -0.04] as Vec3,
};

export const sceneConfig = {
  position: [0, -0.08, -0.36] as Vec3,
  rotation: [0, 0, 0] as Euler3,
  scale: 1.05,
};

export const animationConfig = {
  playDurationMs: 620,
  liftHeight: 0.08,
  spinRadians: PI * 0.06,
};

export const cardGeometry = {
  width: 0.66,
  height: 0.94,
  thickness: 0.008,
};

export const pilePositions = {
  deck: [-1.08, 0.2, 0.02] as Vec3,
  field: [0.05, 0.21, -0.08] as Vec3,
  graveyard: [1.24, 0.2, 0.08] as Vec3,
};

export const centerPileScale = 1.16;
export const tableCardY = 0.18;
export const playerHandOrigin = [0, 0.54, 2.34] as Vec3;
export const screenFacingRotation = [0.72, 0, 0] as Euler3;

const seatRadiusX = 5.16;
const seatRadiusZ = 2.54;

function degToRad(value: number): number {
  return (value / 180) * PI;
}

function createSeat(angleDegrees: number, labelAnchor: SeatPose['labelAnchor']): SeatPose {
  const angle = degToRad(angleDegrees);
  const x = seatRadiusX * Math.sin(angle);
  const z = seatRadiusZ * Math.cos(angle);
  const tangentYaw = Math.atan2(seatRadiusZ * Math.sin(angle), seatRadiusX * Math.cos(angle));

  return {
    position: [x, 0.26, z],
    rotation: [0, tangentYaw, 0],
    labelAnchor,
  };
}

export const seatLayouts: Record<2 | 3 | 4 | 5 | 6, SeatPose[]> = {
  2: [
    createSeat(0, 'front'),
    createSeat(180, 'back'),
  ],
  3: [
    createSeat(0, 'front'),
    createSeat(-126, 'left'),
    createSeat(126, 'right'),
  ],
  4: [
    createSeat(0, 'front'),
    createSeat(-92, 'left'),
    createSeat(180, 'back'),
    createSeat(92, 'right'),
  ],
  5: [
    createSeat(0, 'front'),
    createSeat(-64, 'left'),
    createSeat(-138, 'back'),
    createSeat(138, 'back'),
    createSeat(64, 'right'),
  ],
  6: [
    createSeat(0, 'front'),
    createSeat(-54, 'left'),
    createSeat(-116, 'left'),
    createSeat(180, 'back'),
    createSeat(116, 'right'),
    createSeat(54, 'right'),
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
  const spacing = Math.max(0.5, 0.74 - compact * 0.026);
  const offset = index - mid;

  return {
    position: [offset * spacing, selected ? 0.18 : 0.02, selected ? -0.04 : 0],
    rotation: [0, 0, 0],
    scale: selected ? 1.04 : Math.max(0.74, 0.96 - compact * 0.018),
  };
}

export function getOpponentCardPose(index: number, count: number): CardPose {
  const mid = (count - 1) / 2;
  const spacing = Math.max(0.18, 0.29 - Math.max(0, count - 7) * 0.006);
  const fan = count <= 1 ? 0 : (index - mid) * 0.018;
  return {
    position: [(index - mid) * spacing, 0.012, -Math.abs(index - mid) * 0.006],
    rotation: [0, fan, 0],
    scale: 0.64,
  };
}

export function createDemoHand(count: number): number[] {
  const values = [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6, 3];
  return values.slice(0, clampHandCount(count)).sort((a, b) => a - b);
}
