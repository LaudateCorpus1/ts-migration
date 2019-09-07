// https://github.com/fkling/flow-typestrip but with one change:
// we don't want to blindly strip class properties as they may have initialization values.

import * as recast from 'recast';
import * as babelParser from 'recast/parsers/babel';

function remove(path: any) {
  path.replace();
  return false;
}

function transformClass(this: any, path: any) {
  path.get('typeParameters').replace();
  path.get('superTypeParameters').replace();
  path.get('implements').replace();
  this.traverse(path);
}

function transformClassProperty(this: any, path: any) {
  path.get('variance').replace();
  this.traverse(path);
}

function transformPattern(this: any, path: any) {
  path.get('typeAnnotation').replace();
  this.traverse(path);
}

function transformImport(this: any, path: any) {
  if (['type', 'typeof'].includes(path.node.importKind)) {
    path.replace();
    return false;
  }
  this.traverse(path);
}

function transform(ast: recast.types.ASTNode) {
  recast.types.visit(ast, {
    visitIdentifier: function(path) {
      path.get('optional').replace();
      path.get('typeAnnotation').replace();
      return false;
    },
    visitFunction: function(path) {
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

export default function rewrite(code: string): string {
  const ast = recast.parse(code, {parser: babelParser});
  transform(ast);
  return recast.print(ast).code;
}
