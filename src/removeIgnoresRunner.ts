import {promises as fs} from "fs";
import { FilePaths } from "./cli";
import collectFiles from "./collectFiles";

const replacers = [
  // Start with the JSX ignores, since they span multiple lines and need to be
  // cleaned before we attempt any of the subsequent single-line scrubbing
  {
    re: new RegExp(/\s*\{\/\*\s*\/\/ @ts-ignore .*?\*\/\}/, "gm"),
    replacement: ""
  },
  // Ternary ignores
  {
    re: new RegExp(/\s*\/\/\s*\/\/ @ts-ignore.*$\n/, "gm"),
    replacement: ""
  },
  // Scrub any trailing comments that might exist
  {
    re: new RegExp(/^(.*\S+.*)\/\/ @ts-ignore.*$/, "gm"),
    replacement: "$1"
  },
  // Now remove any remaining lines that have optional whitespace plus a ts-ignore comment
  {
    re: new RegExp(/^.*\/\/ @ts-ignore.*$\n/, "gm"),
    replacement: ""
  }
];

export default async function removeIgnores(paths: FilePaths): Promise<void> {
  console.log("Removing all existing @ts-ignores from input files");
  const start = new Date();
  const files = await collectFiles(paths);
  let modifiedCount = 0;
  await Promise.all(
    files.map(async file => {
      const contents = await fs.readFile(file, "utf8");
      const updatedContents = replacers.reduce(
        (currentContents, replacer) => {
          const res = currentContents.replace(replacer.re, replacer.replacement);
          if (currentContents.length > 0 && res.trim().length === 0) console.log(replacer.re);
          return res;
        },
        contents
      );
      if (updatedContents !== contents) {
        if (updatedContents.trim().length === 0) {
          console.log('what');
          return;
        }
        await fs.writeFile(file, updatedContents);
        // console.log(updatedContents);
        console.log(`Scrubbed existing ignores from ${file}`);
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
