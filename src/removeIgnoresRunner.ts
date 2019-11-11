import fs from "fs";
import { promisify } from "util";
import { FilePaths } from "./cli";
import collectFiles from "./collectFiles";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export default async function removeIgnores(paths: FilePaths): Promise<void> {
  console.log("Removing all existing @ts-ignores from input files");
  const start = new Date();
  const files = await collectFiles(paths);
  let modifiedCount = 0;
  await Promise.all(
    files.map(async file => {
      const contents = await readFile(file, "utf8");
      const updatedContents = [
        // Start with the JSX ignores, since they span multiple lines and need to be
        // cleaned before we attempt any of the subsequent single-line scrubbing
        {
          re: new RegExp(/\s*\{\/\*\s*\/\/ @ts-ignore.*\*\/\}/, "gm"),
          replacement: ""
        },
        // Ternary ignores
        {
          re: new RegExp(/\s*\/\/\s*\/\/ @ts-ignore.*$/, "gm"),
          replacement: ""
        },
        // Scrub any trailing comments that might exist (internary)
        {
          re: new RegExp(/^(.*\S+.*)\/\/ @ts-ignore.*$/, "gm"),
          replacement: "$1"
        },
        // // Now remove any remaining lines that have optional whitespace plus a ts-ignore comment
        { re: new RegExp(/^.*\/\/ @ts-ignore.*$\n/, "gm"), replacement: "" }
      ].reduce(
        (currentContents, replacer) =>
          currentContents.replace(replacer.re, replacer.replacement),
        contents
      );
      if (updatedContents !== contents) {
        console.log(`Scrubbed existing ignores from ${file}`);
        await writeFile(file, updatedContents, "utf8");
        modifiedCount++;
      }
    })
  );
  console.log(
    `Finished scrubbing ${modifiedCount} of ${
      files.length
    } in ${(new Date().getTime() - start.getTime()) / 1000} seconds`
  );
}
