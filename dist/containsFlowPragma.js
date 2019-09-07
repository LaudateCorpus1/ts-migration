"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const flowPragmas = [
    '// @flow',
    '// @flow strict',
    '/* @flow */',
    '/* @flow strict */',
];
function containsFlowPragma(path) {
    return new Promise(resolve => {
        const rl = readline_1.default.createInterface({
            input: fs_1.default.createReadStream(path),
            crlfDelay: Infinity,
        });
        rl.on('line', line => {
            if (flowPragmas.includes(line.trim())) {
                resolve(true);
                rl.close();
            }
        });
        rl.on('close', () => {
            resolve(false);
        });
    });
}
exports.default = containsFlowPragma;
//# sourceMappingURL=containsFlowPragma.js.map