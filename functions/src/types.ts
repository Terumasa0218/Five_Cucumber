export type UserID = string;
export type RoomID = string;
export type GameID = string;

export type GameAction = {
  type: string;
  [k: string]: any;
};

export type GameState = {
  turn: number; // 0..N-1
  seats: string[];
  board?: any;
  hands?: Record<UserID, any>;
  [k: string]: any;
};

export type ProposeMoveInput = {
  roomId: RoomID;
  gameId: GameID;
  opId: string;    // client generated idempotency key
  baseV: number;   // client's current version
  action: GameAction;
};


