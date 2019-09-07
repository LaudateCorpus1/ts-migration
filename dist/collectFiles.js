"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const path_2 = require("path");
const readdir = util_1.promisify(fs_1.default.readdir);
const stat = util_1.promisify(fs_1.default.stat);
function collectFiles(paths, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = dir != null ? dir : paths.rootDir;
        const subdirs = dir != null ? yield readdir(dir) : paths.include.map(include => path_1.default.join(rootDir, include));
        const files = yield Promise.all(subdirs.map((subdir) => __awaiter(this, void 0, void 0, function* () {
            const res = path_2.resolve(rootDir, subdir);
            if (paths.exclude.some(e => res.includes(e))) {
                return [];
            }
            if ((yield stat(res)).isDirectory()) {
                return collectFiles(paths, res);
            }
            if (!paths.extensions.some(e => res.endsWith(e))) {
                return [];
            }
            return res;
        })));
        return files.flat();
    });
}
exports.default = collectFiles;
//# sourceMappingURL=collectFiles.js.map