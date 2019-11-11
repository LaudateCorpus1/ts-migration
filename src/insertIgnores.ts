import ts from "typescript";
import * as utils from "tsutils";
import { NodeWrap } from "tsutils";

const IGNORE_TEXT = "// @ts-ignore (AUTO)";
const TERNARY_REGEX = /^\s*([?:]) (.+)$/;

const jsxKinds = new Set([
  ts.SyntaxKind.JsxElement,
  ts.SyntaxKind.JsxSelfClosingElement,
  ts.SyntaxKind.JsxOpeningElement,
  ts.SyntaxKind.JsxClosingElement,
  ts.SyntaxKind.JsxFragment,
  ts.SyntaxKind.JsxOpeningFragment,
  ts.SyntaxKind.JsxClosingFragment,
  ts.SyntaxKind.JsxAttribute,
  ts.SyntaxKind.JsxAttributes,
  ts.SyntaxKind.JsxSpreadAttribute,
  ts.SyntaxKind.JsxExpression,
]);

function isInJSX(n: NodeWrap | undefined): boolean {
  return n != null && (jsxKinds.has(n.kind) || isInJSX(n.parent));
}

function getLine(diagnostic: ts.Diagnostic) {
  const { line } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!);
  return line;
}

function isJSXTextWithTSIgnore(node: ts.Node): boolean {
  return ts.isJsxText(node) && node.text.includes(IGNORE_TEXT);
}

export default function insertIgnores(
  code: string,
  diagnostics: ts.Diagnostic[],
  includeJSX: boolean
): string {
  // All diagnostics should be for the same file.
  const convertedAST = utils.convertAst(diagnostics[0].file!);

  let lastLine;

  let codeSplitByLine = code.split("\n");
  for (const diagnostic of diagnostics) {
    const wrappedNode = utils.getWrappedNodeAtPosition(
      convertedAST.wrapped,
      diagnostic.start!
    );

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
      const sourceFile = ts.createSourceFile(
        diagnostic.file!.fileName,
        maybeResult.join("\n"),
        ts.ScriptTarget.ESNext
      );
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
        ]
        continue;
      }
    }

    codeSplitByLine = maybeResult;
  }
  return codeSplitByLine.join("\n");
}
