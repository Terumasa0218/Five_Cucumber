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
  fov: 42,
  position: [0, 6.3, 7.55] as Vec3,
  target: [0, 0.08, 0.02] as Vec3,
};

export const sceneConfig = {
  position: [0, -0.08, -0.28] as Vec3,
  rotation: [0, 0, 0] as Euler3,
  scale: 1.02,
};

export const animationConfig = {
  playDurationMs: 620,
  liftHeight: 0.08,
  spinRadians: PI * 0.06,
};

export const cardGeometry = {
  width: 0.56,
  height: 0.82,
  thickness: 0.02,
};

export const pilePositions = {
  deck: [-0.95, 0.26, 0.02] as Vec3,
  field: [0.08, 0.3, -0.08] as Vec3,
  graveyard: [1.12, 0.26, 0.08] as Vec3,
};

export const playerHandOrigin = [0, 0.32, 1.78] as Vec3;

const seatRadiusX = 4.16;
const seatRadiusZ = 2.58;

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
  const spacing = Math.max(0.25, 0.48 - compact * 0.02);
  const arcDepth = Math.min(0.44, count * 0.018);
  const fan = Math.min(0.5, count * 0.026);
  const offset = index - mid;
  const normalized = count <= 1 ? 0 : offset / mid;
  const z = selected ? 0.25 : -Math.abs(normalized) * arcDepth;

  return {
    position: [offset * spacing, selected ? 0.34 : 0.08, z],
    rotation: [0, -normalized * fan, 0],
    scale: selected ? 1.02 : Math.max(0.72, 0.88 - compact * 0.014),
  };
}

export function getOpponentCardPose(index: number, count: number): CardPose {
  const mid = (count - 1) / 2;
  const spacing = Math.max(0.16, 0.24 - Math.max(0, count - 7) * 0.006);
  const fan = count <= 1 ? 0 : (index - mid) * 0.018;
  return {
    position: [(index - mid) * spacing, 0.04, -Math.abs(index - mid) * 0.006],
    rotation: [0, fan, 0],
    scale: 0.58,
  };
}

export function createDemoHand(count: number): number[] {
  const values = [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 6, 3];
  return values.slice(0, clampHandCount(count)).sort((a, b) => a - b);
}
