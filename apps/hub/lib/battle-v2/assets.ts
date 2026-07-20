export type BattleV2AssetSlot = {
  color: string;
  textureUrl?: string | null;
};

export type BattleV2AssetConfig = {
  backgroundImageUrl?: string | null;
  backgroundColor: string;
  table: BattleV2AssetSlot;
  tableRim: BattleV2AssetSlot;
  cardFace: BattleV2AssetSlot;
  cardBack: BattleV2AssetSlot;
  cardSide: BattleV2AssetSlot;
};

export const battleV2Assets: BattleV2AssetConfig = {
  backgroundImageUrl: null,
  backgroundColor: '#111611',
  table: {
    color: '#097440',
    textureUrl: null,
  },
  tableRim: {
    color: '#6f441d',
    textureUrl: null,
  },
  cardFace: {
    color: '#fff5da',
    textureUrl: null,
  },
  cardBack: {
    color: '#17452f',
    textureUrl: null,
  },
  cardSide: {
    color: '#eadfbd',
    textureUrl: null,
  },
};
