"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGame = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const engine_1 = require("./engine");
const hashState_1 = require("./utils/hashState");
const db = admin.firestore();
exports.startGame = (0, https_1.onCall)(async (req) => {
    var _a, _b, _c;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new Error('UNAUTHENTICATED');
    const { roomId } = req.data;
    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists)
        throw new Error('ROOM_NOT_FOUND');
    const room = roomSnap.data();
    const seats = ((_c = (_b = room.seats) === null || _b === void 0 ? void 0 : _b.map((s) => (s === null || s === void 0 ? void 0 : s.uid) || (s === null || s === void 0 ? void 0 : s.id) || (s === null || s === void 0 ? void 0 : s.nickname))) === null || _c === void 0 ? void 0 : _c.filter(Boolean)) || room.members || [];
    if (!Array.isArray(seats) || seats.length < 2)
        throw new Error('NOT_ENOUGH_PLAYERS');
    const seed = `${Date.now()}:${roomId}`; // サーバーでのみ生成
    const gameRef = roomRef.collection('games').doc();
    const gameId = gameRef.id;
    const initial = (0, engine_1.initGame)(seats, seed);
    const v = 0;
    await db.runTransaction(async (tx) => {
        tx.set(gameRef, {
            status: 'playing', v, seed, seats, turn: initial.turn, state: initial,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        for (const playerId of seats) {
            const view = (0, engine_1.projectViewFor)(initial, playerId);
            const h = (0, hashState_1.hashState)(view);
            tx.set(gameRef.collection('views').doc(playerId), { v, h, state: view });
        }
        tx.set(gameRef.collection('events').doc('0'), {
            seq: 0, type: 'game_started', createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    await roomRef.set({ currentGameId: gameId }, { merge: true });
    return { gameId };
});
//# sourceMappingURL=startGame.js.map