"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const utils = __importStar(require("tsutils"));
const IGNORE_TEXT = "// @ts-ignore (AUTO)";
const TERNARY_REGEX = /^\s*([?:]) (.+)$/;
const jsxKinds = new Set([
    typescript_1.default.SyntaxKind.JsxElement,
    typescript_1.default.SyntaxKind.JsxSelfClosingElement,
    typescript_1.default.SyntaxKind.JsxOpeningElement,
    typescript_1.default.SyntaxKind.JsxClosingElement,
    typescript_1.default.SyntaxKind.JsxFragment,
    typescript_1.default.SyntaxKind.JsxOpeningFragment,
    typescript_1.default.SyntaxKind.JsxClosingFragment,
    typescript_1.default.SyntaxKind.JsxAttribute,
    typescript_1.default.SyntaxKind.JsxAttributes,
    typescript_1.default.SyntaxKind.JsxSpreadAttribute,
    typescript_1.default.SyntaxKind.JsxExpression,
]);
function isInJSX(n) {
    return n != null && (jsxKinds.has(n.kind) || isInJSX(n.parent));
}
function getLine(diagnostic) {
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return line;
}
function isJSXTextWithTSIgnore(node) {
    return typescript_1.default.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}
function insertIgnores(code, diagnostics, includeJSX) {
    // All diagnostics should be for the same file.
    const convertedAST = utils.convertAst(diagnostics[0].file);
    let lastLine;
    let codeSplitByLine = code.split("\n");
    for (const diagnostic of diagnostics) {
        const wrappedNode = utils.getWrappedNodeAtPosition(convertedAST.wrapped, diagnostic.start);
        const isNodeInJSX = isInJSX(wrappedNode);
        if (isNodeInJSX && !includeJSX) {
            continue;
        }
        const line = getLine(diagnostic);
        if (lastLine != null && line > lastLine) {
            throw new Error("Diagnostics should be ordered from last to first line.");
        }
        if (line === lastLine) {
            continue;
        }
        lastLine = line;
        const ignoreComment = IGNORE_TEXT;
        const maybeResult = [
            ...codeSplitByLine.slice(0, line),
            ignoreComment,
            ...codeSplitByLine.slice(line)
        ];
        if (isNodeInJSX) {
            // Check if we need JSX-style ignore by seeing if the naive insertion creates a JSX text node.
            const sourceFile = typescript_1.default.createSourceFile(diagnostic.file.fileName, maybeResult.join("\n"), typescript_1.default.ScriptTarget.ESNext);
            const newConvertedAst = utils.convertAst(sourceFile);
            if (newConvertedAst.flat.some(isJSXTextWithTSIgnore)) {
                codeSplitByLine = [
                    ...codeSplitByLine.slice(0, line),
                    "{ /*",
                    `${ignoreComment} */ }`,
                    ...codeSplitByLine.slice(line)
                ];
                continue;
            }
        }
        // Prettier will move the comment if it's before a line for a multiline ternary.
        const match = codeSplitByLine[line].match(TERNARY_REGEX);
        if (match) {
            codeSplitByLine = [
                ...codeSplitByLine.slice(0, line),
                `${match[1]} //`,
                ignoreComment,
                match[2],
                ...codeSplitByLine.slice(line + 1)
            ];
            continue;
        }
        // Make sure we insert _before_ an eslint ignore.
        if (line > 0) {
            const lastLine = codeSplitByLine[line - 1];
            if (lastLine.trimStart().startsWith("// eslint-disable-next-line")) {
                codeSplitByLine = [
                    ...codeSplitByLine.slice(0, line - 1),
                    ignoreComment,
                    lastLine,
                    ...codeSplitByLine.slice(line),
                ];
                continue;
            }
        }
        codeSplitByLine = maybeResult;
    }
    return codeSplitByLine.join("\n");
}
exports.default = insertIgnores;
//# sourceMappingURL=insertIgnores.js.map