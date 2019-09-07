import { parse } from '@babel/parser';
import traverse, { Node } from '@babel/traverse';

const isTypeKind = (kind: string | null) => kind != null && ['type', 'typeof'].includes(kind);

type CheckResult = {
  ok: false;
} | {
  ok: true;
  shouldStrip: boolean;
};

export default function checkCode(code: string): CheckResult {
  const ast = (() => {
    try {
      return parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          ['flow', {all: true}],
          'classProperties',
          'dynamicImport',
          'objectRestSpread',
          'optionalChaining',
        ],
      });
    } catch (err) {
      console.warn(err);
      return null;
    }
  })();

  if (ast == null) {
    return {ok: false};
  }

  // @ts-ignore ast.comments is any?
  const isFlowFile = ast.comments.some(comment => ['@flow', '@flow strict'].includes(comment.value.trim()));
  if (isFlowFile) return {ok: true, shouldStrip: false};

  type Usage = {
    contents: string;
    start: number;
    end: number;
  }

  const usages: {[key: string]: Usage[]} = {
    imports: [],
    exports: [],
    aliases: [],
    annotations: [],
  };

  function makeUsage(node: Node): Usage {
    const start = node.start!;
    const end = node.end!;
    return {
      contents: code.slice(start, end),
      start,
      end,
    }
  }

  function pushUsage(usageArray: Usage[], node: Node) {
    usageArray.push(makeUsage(node));
  }

  traverse(ast, {
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
      const {superTypeParameters} = path.node;
      if (superTypeParameters != null) {
        pushUsage(usages.annotations, superTypeParameters);
      }
    },
    TypeAlias(path) {
      usages.aliases.push(makeUsage(path.node));
    },
    TypeAnnotation(path) {
      const usage = makeUsage(path.node);
      const {start, end} = usage;
      if (!usages.aliases.some(alias => alias.start <= start && alias.end >= end)) {
        usages.annotations.push(usage);
      }
    },
  });

  if ([usages.imports, usages.exports, usages.aliases, usages.annotations].every(usageArray => usageArray.length === 0)) {
    return {ok: true, shouldStrip: false};
  }

  return {ok: true, shouldStrip: true};
}
