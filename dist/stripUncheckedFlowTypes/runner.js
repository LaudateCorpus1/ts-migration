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
const collectFiles_1 = __importDefault(require("../collectFiles"));
const util_1 = require("../util");
const commitAll_1 = __importDefault(require("../commitAll"));
const containsFlowPragma_1 = __importDefault(require("../containsFlowPragma"));
const check_1 = __importDefault(require("./check"));
const rewrite_1 = __importDefault(require("./rewrite"));
function run(filePaths, shouldCommit) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield util_1.asyncFilter(yield collectFiles_1.default(filePaths), (path) => __awaiter(this, void 0, void 0, function* () { return !(yield containsFlowPragma_1.default(path)); }));
        let numFilesMatched = 0;
        let numFilesSkipped = 0;
        const errorFiles = [];
        yield util_1.asyncForEach(files, (path, i) => __awaiter(this, void 0, void 0, function* () {
            console.log(`${i + 1} of ${files.length}: Checking ${path}`);
            try {
                const code = fs_1.default.readFileSync(path, 'utf8');
                const res = check_1.default(code);
                if (!res.ok) {
                    errorFiles.push(path);
                    return;
                }
                else if (!res.shouldStrip) {
                    numFilesSkipped += 1;
                    return;
                }
                console.log(`- Stripping Flow types...`);
                fs_1.default.writeFileSync(path, rewrite_1.default(code));
                numFilesMatched += 1;
            }
            catch (e) {
                console.log(e);
                errorFiles.push(path);
            }
        }));
        console.log(`${numFilesMatched} stripped successfully. (${numFilesSkipped} skipped.)`);
        console.log(`${errorFiles.length} errors:`);
        if (errorFiles.length)
            console.log(errorFiles);
        if (shouldCommit) {
            yield commitAll_1.default("Strip unchecked Flow types", filePaths);
        }
        else {
            console.log("skipping commit in dry run mode");
        }
    });
}
exports.default = run;
//# sourceMappingURL=runner.js.map