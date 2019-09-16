import fs from "fs";
import path from "path";

import { promisify } from "util";
import { resolve } from "path";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

type Paths = {
  rootDir: string;
  include: string[];
  exclude: string[];
  extensions: string[];
}

export default async function collectFiles(paths: Paths, dir?: string): Promise<string[]> {
  const rootDir = dir != null ? dir : paths.rootDir;
  const subdirs = dir != null ? await readdir(dir) : paths.include.map(include => path.join(rootDir, include));

  const files = await Promise.all(
    subdirs.map(async (subdir: string) => {
      const res = resolve(rootDir, subdir);
      if (paths.exclude.some(e => res.includes(e))) {
        return [];
      }

      if ((await stat(res)).isDirectory()) {
        return collectFiles(paths, res);
      }

      if (!paths.extensions.some(e => res.endsWith(e))) {
        return [];
      }

      return res;
    })
  );
  return files.flat();
}
