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
  backgroundColor: '#151916',
  table: {
    color: '#1f6b43',
    textureUrl: null,
  },
  tableRim: {
    color: '#7d5a24',
    textureUrl: null,
  },
  cardFace: {
    color: '#f5ead0',
    textureUrl: null,
  },
  cardBack: {
    color: '#214d34',
    textureUrl: null,
  },
  cardSide: {
    color: '#d2ba7a',
    textureUrl: null,
  },
};
