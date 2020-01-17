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
const fs_1 = require("fs");
const collectFiles_1 = __importDefault(require("./collectFiles"));
const replacers = [
    // Start with the JSX ignores, since they span multiple lines and need to be
    // cleaned before we attempt any of the subsequent single-line scrubbing
    {
        re: new RegExp(/\s*\{\/\*\s*\/\/ @ts-ignore .*?\*\/\}/, "gm"),
        replacement: ""
    },
    // Ternary ignores
    {
        re: new RegExp(/\s*\/\/\s*\/\/ @ts-ignore.*$\n/, "gm"),
        replacement: ""
    },
    // Scrub any trailing comments that might exist
    {
        re: new RegExp(/^(.*\S+.*)\/\/ @ts-ignore.*$/, "gm"),
        replacement: "$1"
    },
    // Now remove any remaining lines that have optional whitespace plus a ts-ignore comment
    {
        re: new RegExp(/^.*\/\/ @ts-ignore.*$\n/, "gm"),
        replacement: ""
    }
];
function removeIgnores(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Removing all existing @ts-ignores from input files");
        const start = new Date();
        const files = yield collectFiles_1.default(paths);
        let modifiedCount = 0;
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            const contents = yield fs_1.promises.readFile(file, "utf8");
            const updatedContents = replacers.reduce((currentContents, replacer) => {
                const res = currentContents.replace(replacer.re, replacer.replacement);
                if (currentContents.length > 0 && res.trim().length === 0)
                    console.log(replacer.re);
                return res;
            }, contents);
            if (updatedContents !== contents) {
                if (updatedContents.trim().length === 0) {
                    console.log('what');
                    return;
                }
                yield fs_1.promises.writeFile(file, updatedContents);
                // console.log(updatedContents);
                console.log(`Scrubbed existing ignores from ${file}`);
                modifiedCount++;
            }
        })));
        console.log(`Finished scrubbing ${modifiedCount} of ${files.length} in ${(new Date().getTime() - start.getTime()) / 1000} seconds`);
    });
}
exports.default = removeIgnores;
//# sourceMappingURL=removeIgnoresRunner.js.map