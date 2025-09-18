"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeMove = exports.startGame = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var startGame_1 = require("./startGame");
Object.defineProperty(exports, "startGame", { enumerable: true, get: function () { return startGame_1.startGame; } });
var proposeMove_1 = require("./proposeMove");
Object.defineProperty(exports, "proposeMove", { enumerable: true, get: function () { return proposeMove_1.proposeMove; } });
//# sourceMappingURL=index.js.map