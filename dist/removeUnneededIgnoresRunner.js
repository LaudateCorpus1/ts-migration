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
const lodash_1 = require("lodash");
const fs_2 = require("fs");
// import commit from "./commitAll";
const prettierFormat_1 = __importDefault(require("./prettierFormat"));
const tsCompilerHelpers_1 = require("./tsCompilerHelpers");
const replacers = [
    // Start with the JSX ignores, since they span multiple lines and need to be
    // cleaned before we attempt any of the subsequent single-line scrubbing
    {
        re: new RegExp(/\s*\{\/\*\s*\/\/ \?ts-ignore .*?\*\/\}/, "gm"),
        replacement: ""
    },
    // Ternary ignores
    {
        re: new RegExp(/\s*\/\/\s*\/\/ \?ts-ignore.*$\n/, "gm"),
        replacement: ""
    },
    // Scrub any trailing comments that might exist
    {
        re: new RegExp(/^(.*\S+.*)\/\/ \?ts-ignore.*$/, "gm"),
        replacement: "$1"
    },
    // Now remove any remaining lines that have optional whitespace plus a ts-ignore comment
    {
        re: new RegExp(/^.*\/\/ \?ts-ignore.*$\n/, "gm"),
        replacement: ""
    }
];
function replaceIgnores(files) {
    return __awaiter(this, void 0, void 0, function* () {
        const modifiedFiles = [];
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            const contents = yield fs_1.promises.readFile(file, "utf8");
            const updatedContents = contents.replace(/\/\/ @ts-ignore/g, '// ?ts-ignore');
            if (updatedContents !== contents) {
                yield fs_1.promises.writeFile(file, updatedContents);
                modifiedFiles.push(file);
            }
        })));
        return modifiedFiles;
    });
}
function updateIgnores(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        const diagnostics = yield tsCompilerHelpers_1.getDiagnostics(paths);
        const diagnosticsWithFile = diagnostics.filter(d => d.file != null && !paths.exclude.some(e => d.file.fileName.includes(e)));
        const diagnosticsGroupedByFile = lodash_1.groupBy(diagnosticsWithFile, d => d.file.fileName);
        const successFiles = [];
        const errorFiles = [];
        Object.entries(diagnosticsGroupedByFile).forEach(([fileName, fileDiagnostics], i, arr) => {
            const diagnosticLines = new Set(fileDiagnostics
                .map(d => d.file.getLineAndCharacterOfPosition(d.start).line)
                .reverse());
            console.log(`${i + 1} of ${arr.length}: Updating ${fileName}... (${diagnosticLines.size} bad lines)`);
            try {
                const fileData = fs_2.readFileSync(fileName, "utf8");
                fs_2.writeFileSync(fileName, _updateIgnores(fileData, diagnosticLines));
                successFiles.push(fileName);
            }
            catch (e) {
                console.log(e);
                errorFiles.push(fileName);
            }
        });
        console.log(`${successFiles.length} files with errors ignored successfully.`);
        if (errorFiles.length) {
            console.log(`Error handling ${errorFiles.length} files:`);
            console.log(errorFiles);
        }
    });
}
const commentRegex = /^\s*\/\//;
function getIgnoreLineNumber(lines, lineNumber) {
    for (let n = lineNumber - 1; n >= 0; --n) {
        if (!commentRegex.test(lines[n]))
            return -1;
        if (lines[n].includes('?ts-ignore'))
            return n;
    }
    return -1;
}
function _updateIgnores(code, lines) {
    const codeSplitByLine = code.split("\n");
    for (const line of lines) {
        const ignoreLine = getIgnoreLineNumber(codeSplitByLine, line);
        if (ignoreLine !== -1) {
            codeSplitByLine[ignoreLine] = codeSplitByLine[ignoreLine].replace('?ts-ignore', '@ts-ignore');
        }
    }
    return replacers.reduce((currentContents, replacer) => currentContents.replace(replacer.re, replacer.replacement), codeSplitByLine.join("\n"));
}
function removeIgnores(files, rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            const contents = yield fs_1.promises.readFile(file, "utf8");
            const updatedContents = replacers.reduce((currentContents, replacer) => currentContents.replace(replacer.re, replacer.replacement), contents);
            const formattedContents = prettierFormat_1.default(updatedContents, rootDir);
            if (formattedContents !== contents) {
                yield fs_1.promises.writeFile(file, formattedContents);
            }
        })));
    });
}
function run(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Collecting files...");
        const files = yield collectFiles_1.default(paths);
        console.log("Temporarily masking all existing @ts-ignores from input files");
        const start = new Date();
        const modifiedFiles = yield replaceIgnores(files);
        console.log(`Updated ${files.length} files in ${(new Date().getTime() - start.getTime()) / 1000} seconds`);
        yield updateIgnores(paths);
        yield removeIgnores(modifiedFiles, paths.rootDir);
    });
}
exports.default = run;
//# sourceMappingURL=removeUnneededIgnoresRunner.js.map