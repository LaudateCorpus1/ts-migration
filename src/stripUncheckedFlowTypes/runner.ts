import fs from "fs";
import * as prettier from "prettier";

import collectFiles from "../collectFiles";
import { asyncForEach, asyncFilter } from "../util";
import commit from "../commitAll";
import { FilePaths } from "../cli";
import containsFlowPragma from "../containsFlowPragma";

import check from "./check";
import rewrite from "./rewrite";

function prettierFormat(code: string, filepath: string) {
  return prettier.format(code, { ...prettier.resolveConfig.sync(filepath), filepath });
}

export default async function run(
  filePaths: FilePaths,
  shouldCommit: boolean,
) {
  const files = await asyncFilter(await collectFiles(filePaths), async path => !await containsFlowPragma(path));
  let numFilesMatched = 0;
  let numFilesSkipped = 0;
  const errorFiles: string[] = [];

  await asyncForEach(files, async (path, i) => {
    console.log(`${i + 1} of ${files.length}: Checking ${path}`);
    try {
      const code = fs.readFileSync(path, 'utf8');
      const res = check(code);
      if (!res.ok) {
        errorFiles.push(path);
        return;
      } else if (!res.shouldStrip) {
        numFilesSkipped += 1;
        return;
      }

      console.log(`- Stripping Flow types...`);
      const newCode = prettierFormat(rewrite(code), path);
      fs.writeFileSync(path, newCode);
      numFilesMatched += 1;
    } catch (e) {
      console.log(e);
      errorFiles.push(path);
    }
  });

  console.log(`${numFilesMatched} stripped successfully. (${numFilesSkipped} skipped.)`);
  console.log(`${errorFiles.length} errors:`);
  if (errorFiles.length) console.log(errorFiles);

  if (shouldCommit) {
    await commit("Strip unchecked Flow types", filePaths);
  } else {
    console.log("skipping commit in dry run mode");
  }
}
