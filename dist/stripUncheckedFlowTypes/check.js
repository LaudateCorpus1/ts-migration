"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
const isTypeKind = (kind) => kind != null && ['type', 'typeof'].includes(kind);
function checkCode(code) {
    const ast = (() => {
        try {
            return parser_1.parse(code, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    ['flow', { all: true }],
                    'classProperties',
                    'dynamicImport',
                    'objectRestSpread',
                    'optionalChaining',
                ],
            });
        }
        catch (err) {
            console.warn(err);
            return null;
        }
    })();
    if (ast == null) {
        return { ok: false };
    }
    // @ts-ignore ast.comments is any?
    const isFlowFile = ast.comments.some(comment => ['@flow', '@flow strict'].includes(comment.value.trim()));
    if (isFlowFile)
        return { ok: true, shouldStrip: false };
    const usages = {
        imports: [],
        exports: [],
        aliases: [],
        annotations: [],
    };
    function makeUsage(node) {
        const start = node.start;
        const end = node.end;
        return {
            contents: code.slice(start, end),
            start,
            end,
        };
    }
    function pushUsage(usageArray, node) {
        usageArray.push(makeUsage(node));
    }
    traverse_1.default(ast, {
        ImportSpecifier(path) {
            if (isTypeKind(path.node.importKind)) {
                pushUsage(usages.imports, path.node);
            }
        },
        ImportDeclaration(path) {
            if (isTypeKind(path.node.importKind)) {
                pushUsage(usages.imports, path.node);
            }
        },
        ExportNamedDeclaration(path) {
            if (isTypeKind(path.node.exportKind)) {
                pushUsage(usages.exports, path.node);
            }
        },
        ClassDeclaration(path) {
            const { superTypeParameters } = path.node;
            if (superTypeParameters != null) {
                pushUsage(usages.annotations, superTypeParameters);
            }
        },
        TypeAlias(path) {
            usages.aliases.push(makeUsage(path.node));
        },
        TypeAnnotation(path) {
            const usage = makeUsage(path.node);
            const { start, end } = usage;
            if (!usages.aliases.some(alias => alias.start <= start && alias.end >= end)) {
                usages.annotations.push(usage);
            }
        },
    });
    if ([usages.imports, usages.exports, usages.aliases, usages.annotations].every(usageArray => usageArray.length === 0)) {
        return { ok: true, shouldStrip: false };
    }
    return { ok: true, shouldStrip: true };
}
exports.default = checkCode;
//# sourceMappingURL=check.js.map