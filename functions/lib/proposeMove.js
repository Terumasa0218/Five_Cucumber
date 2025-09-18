"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeMove = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const engine_1 = require("./engine");
const hashState_1 = require("./utils/hashState");
const db = admin.firestore();
exports.proposeMove = (0, https_1.onCall)(async (req) => {
    var _a;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new Error('UNAUTHENTICATED');
    const { roomId, gameId, opId, baseV, action } = req.data;
    const gameRef = db.collection('rooms').doc(roomId).collection('games').doc(gameId);
    const opRef = gameRef.collection('appliedOps').doc(opId);
    return await db.runTransaction(async (tx) => {
        const [gameSnap, opSnap] = await Promise.all([tx.get(gameRef), tx.get(opRef)]);
        if (!gameSnap.exists)
            throw new Error('GAME_NOT_FOUND');
        if (opSnap.exists) {
            const g = gameSnap.data();
            return { v: g.v, dedup: true };
        }
        const g = gameSnap.data();
        if (g.status !== 'playing')
            throw new Error('NOT_PLAYING');
        if (g.v !== baseV)
            throw new Error('STALE_VERSION');
        const seats = g.seats;
        const actorSeat = seats.indexOf(uid);
        if (actorSeat === -1)
            throw new Error('NOT_IN_GAME');
        const fullState = Object.assign(Object.assign({}, (g.state || {})), { seats, turn: g.turn });
        if (!(0, engine_1.validate)(fullState, action, actorSeat))
            throw new Error('INVALID_MOVE');
        const next = (0, engine_1.apply)(fullState, action);
        const newV = g.v + 1;
        tx.update(gameRef, {
            v: newV,
            state: next,
            turn: next.turn,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        tx.set(gameRef.collection('events').doc(String(newV)), {
            seq: newV, playerId: uid, action, createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        for (const playerId of seats) {
            const view = (0, engine_1.projectViewFor)(next, playerId);
            const h = (0, hashState_1.hashState)(view);
            tx.set(gameRef.collection('views').doc(playerId), { v: newV, h, state: view }, { merge: true });
        }
        tx.set(opRef, { playerId: uid, baseV, appliedAt: admin.firestore.FieldValue.serverTimestamp() });
        return { v: newV };
    });
});
//# sourceMappingURL=proposeMove.js.map