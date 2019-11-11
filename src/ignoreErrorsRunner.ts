import { groupBy, uniqBy } from "lodash";
import { readFileSync, writeFileSync } from "fs";
import insertIgnores from "./insertIgnores";
import commit from "./commitAll";
import prettierFormat from "./prettierFormat";
import { getFilePath, getDiagnostics } from "./tsCompilerHelpers";
import { FilePaths } from "./cli";

const successFiles: string[] = [];
const errorFiles: string[] = [];

export default async function compile(
  paths: FilePaths,
  shouldCommit: boolean,
  includeJSX: boolean
): Promise<void> {
  const diagnostics = await getDiagnostics(paths);
  const diagnosticsWithFile = diagnostics.filter(
    d => !!d.file && !paths.exclude.some(e => d.file!.fileName.includes(e))
  );
  const diagnosticsGroupedByFile = groupBy(
    diagnosticsWithFile,
    d => d.file!.fileName
  );

  Object.keys(diagnosticsGroupedByFile).forEach((fileName, i, arr) => {
    const fileDiagnostics = uniqBy(diagnosticsGroupedByFile[fileName], d =>
      d.file!.getLineAndCharacterOfPosition(d.start!)
    ).reverse();
    console.log(
      `${i} of ${arr.length - 1}: Ignoring ${
        fileDiagnostics.length
      } ts-error(s) in ${fileName}`
    );
    try {
      const filePath = getFilePath(paths, fileDiagnostics[0]);
      const fileData = insertIgnores(readFileSync(filePath, "utf8"), fileDiagnostics, includeJSX);
      const formattedFileData = prettierFormat(fileData, paths.rootDir);
      writeFileSync(filePath, formattedFileData);
      successFiles.push(fileName);
    } catch (e) {
      console.log(e);
      errorFiles.push(fileName);
    }
  });

  if (shouldCommit) {
    await commit("Ignore errors", paths);
  }

  console.log(`${successFiles.length} files with errors ignored successfully.`);
  if (errorFiles.length) {
    console.log(`Error handling ${errorFiles.length} files:`);
    console.log(errorFiles);
  }
}
