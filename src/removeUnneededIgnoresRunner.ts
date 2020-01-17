import {promises as fs} from "fs";
import { FilePaths } from "./cli";
import collectFiles from "./collectFiles";
import { groupBy } from "lodash";
import { readFileSync, writeFileSync } from "fs";
// import commit from "./commitAll";
import prettierFormat from "./prettierFormat";
import { getDiagnostics } from "./tsCompilerHelpers";

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

async function replaceIgnores(files: string[]): Promise<string[]> {
  const modifiedFiles: string[] = [];
  await Promise.all(
    files.map(async file => {
      const contents = await fs.readFile(file, "utf8");
      const updatedContents = contents.replace(/\/\/ @ts-ignore/g, '// ?ts-ignore');
      if (updatedContents !== contents) {
        await fs.writeFile(file, updatedContents);
        modifiedFiles.push(file);
      }
    })
  );
  return modifiedFiles;
}

async function updateIgnores(paths: FilePaths): Promise<void> {
  const diagnostics = await getDiagnostics(paths);
  const diagnosticsWithFile = diagnostics.filter(
    d => d.file != null && !paths.exclude.some(e => d.file!.fileName.includes(e))
  );
  const diagnosticsGroupedByFile = groupBy(
    diagnosticsWithFile,
    d => d.file!.fileName
  );

  const successFiles: string[] = [];
  const errorFiles: string[] = [];

  Object.entries(diagnosticsGroupedByFile).forEach(([fileName, fileDiagnostics], i, arr) => {
    const diagnosticLines = new Set(
      fileDiagnostics
        .map(d => d.file!.getLineAndCharacterOfPosition(d.start!).line)
        .reverse()
    );

    console.log(
      `${i + 1} of ${arr.length}: Updating ${fileName}... (${diagnosticLines.size} bad lines)`
    );

    try {
      const fileData = readFileSync(fileName, "utf8");
      writeFileSync(fileName, _updateIgnores(fileData, diagnosticLines));
      successFiles.push(fileName);
    } catch (e) {
      console.log(e);
      errorFiles.push(fileName);
    }
  });

  console.log(`${successFiles.length} files with errors ignored successfully.`);
  if (errorFiles.length) {
    console.log(`Error handling ${errorFiles.length} files:`);
    console.log(errorFiles);
  }
}

const commentRegex = /^\s*\/\//;

function getIgnoreLineNumber(lines: string[], lineNumber: number) {
  for (let n = lineNumber - 1; n >= 0; --n) {
    if (!commentRegex.test(lines[n])) return -1;
    if (lines[n].includes('?ts-ignore')) return n;
  }
  return -1;
}

function _updateIgnores(
  code: string,
  lines: Set<number>,
): string {
  const codeSplitByLine = code.split("\n");

  for (const line of lines) {
    const ignoreLine = getIgnoreLineNumber(codeSplitByLine, line);
    if (ignoreLine !== -1) {
      codeSplitByLine[ignoreLine] = codeSplitByLine[ignoreLine].replace('?ts-ignore', '@ts-ignore');
    }
  }

  return replacers.reduce(
    (currentContents, replacer) => currentContents.replace(replacer.re, replacer.replacement),
    codeSplitByLine.join("\n")
  );
}

async function removeIgnores(files: string[], rootDir: string) {
  await Promise.all(
    files.map(async file => {
      const contents = await fs.readFile(file, "utf8");
      const updatedContents = replacers.reduce(
        (currentContents, replacer) => currentContents.replace(replacer.re, replacer.replacement),
        contents
      );
      const formattedContents = prettierFormat(updatedContents, rootDir);
      if (formattedContents !== contents) {
        await fs.writeFile(file, formattedContents);
      }
    })
  );
}

export default async function run(paths: FilePaths) {
  console.log("Collecting files...");
  const files = await collectFiles(paths);

  console.log("Temporarily masking all existing @ts-ignores from input files");
  const start = new Date();
  const modifiedFiles = await replaceIgnores(files);
  console.log(
    `Updated ${files.length} files in ${(new Date().getTime() - start.getTime()) / 1000} seconds`
  );

  await updateIgnores(paths);
  await removeIgnores(modifiedFiles, paths.rootDir);
}
