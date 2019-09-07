"use strict";
// https://github.com/fkling/flow-typestrip but with one change:
// we don't want to blindly strip class properties as they may have initialization values.
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const recast = __importStar(require("recast"));
const babelParser = __importStar(require("recast/parsers/babel"));
function remove(path) {
    path.replace();
    return false;
}
function transformClass(path) {
    path.get('typeParameters').replace();
    path.get('superTypeParameters').replace();
    path.get('implements').replace();
    this.traverse(path);
}
function transformClassProperty(path) {
    path.get('variance').replace();
    this.traverse(path);
}
function transformPattern(path) {
    path.get('typeAnnotation').replace();
    this.traverse(path);
}
function transformImport(path) {
    if (['type', 'typeof'].includes(path.node.importKind)) {
        path.replace();
        return false;
    }
    this.traverse(path);
}
function transform(ast) {
    recast.types.visit(ast, {
        visitIdentifier: function (path) {
            path.get('optional').replace();
            path.get('typeAnnotation').replace();
            return false;
        },
        visitFunction: function (path) {
            path.get('returnType').replace();
            path.get('typeParameters').replace();
            this.traverse(path);
        },
        visitClassDeclaration: transformClass,
        visitClassExpression: transformClass,
        visitArrayPattern: transformPattern,
        visitObjectPattern: transformPattern,
        visitTypeAnnotation: remove,
        visitClassImplements: remove,
        visitClassProperty: transformClassProperty,
        visitInterfaceDeclaration: remove,
        visitTypeAlias: remove,
        visitDeclareVariable: remove,
        visitDeclareFunction: remove,
        visitDeclareClass: remove,
        visitDeclareModule: remove,
        visitImportDeclaration: transformImport,
        visitImportSpecifier: transformImport,
    });
}
function rewrite(code) {
    const ast = recast.parse(code, { parser: babelParser });
    transform(ast);
    return recast.print(ast).code;
}
exports.default = rewrite;
//# sourceMappingURL=rewrite.js.map