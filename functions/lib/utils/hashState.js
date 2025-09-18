"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashState = void 0;
const crypto_1 = require("crypto");
const hashState = (s) => {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(s)).digest('base64').slice(0, 8);
};
exports.hashState = hashState;
//# sourceMappingURL=hashState.js.map