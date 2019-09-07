import fs from "fs";
import readline from "readline";

const flowPragmas = [
  '// @flow',
  '// @flow strict',
  '/* @flow */',
  '/* @flow strict */',
];

export default function containsFlowPragma(path: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: fs.createReadStream(path),
      crlfDelay: Infinity,
    });

    rl.on('line', line => {
      if (flowPragmas.includes(line.trim())) {
        resolve(true);
        rl.close();
      }
    });

    rl.on('close', () => {
      resolve(false);
    })
  });
}
