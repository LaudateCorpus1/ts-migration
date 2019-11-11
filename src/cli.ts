import program from "commander";
import { createTSCompiler } from "./tsCompilerHelpers";
import stripComments from "./stripCommentsRunner";
import ignoreErrors from "./ignoreErrorsRunner";
import convertCodebase from "./convertCodebase";
import checkTypes from "./checkRunner";
import stripUncheckedFlowTypes from "./stripUncheckedFlowTypes/runner";

const rootDir = process.cwd();

const { configJSON } = createTSCompiler(rootDir);

export interface FilePaths {
  rootDir: string;
  include: string[];
  exclude: string[];
  extensions: string[];
}

const filePaths: FilePaths = {
  rootDir,
  include: configJSON.config.include || ["/"],
  exclude: ["node_modules", ...(configJSON.config.exclude || [])],
  extensions: [".ts", ".tsx"]
};

program
  .command("strip-comments")
  .option("-c, --commit")
  .option(
    "--comments <list>",
    "A comma-seperated list of comments to strip. Must start with `//`",
    (f: string) => f.split(",")
  )
  .action(
    (cmd: { commit: boolean | undefined; comments: string[] | undefined }) => {
      console.log("Stripping comments from files...");
      if (cmd.comments) console.log("Removing comments: ", cmd.comments);
      stripComments(filePaths, cmd.comments, !!cmd.commit);
    }
  );

program
  .command("convert-codebase")
  .option("-c, --commit")
  // TODO support directory?
  .option(
    "--files <list>",
    "A comma-seperated list of files to convert",
    (f: string) => f.split(",")
  )
  .option(
    "--exclude <list>",
    "A comma-seperated list of strings to exclude",
    (f: string) => f.split(",")
  )
  .option(
    "--no-force-tsx",
    "Use a .ts extension if there is no JSX"
  )
  .option(
    "--no-require-flow-pragma",
    "Convert all files even if they don't have a @flow comment"
  )
  .action(
    (cmd: {
      commit: boolean | undefined;
      files: string[] | undefined;
      exclude: string[] | undefined;
      forceTsx: boolean;
      requireFlowPragma: boolean;
    }) => {
      console.log("Converting the codebase from Flow to Typescript");
      const paths = {
        ...filePaths,
        exclude: [...filePaths.exclude, ...(cmd.exclude || [])],
        extensions: [".js", ".jsx"]
      };
      console.log(paths);
      convertCodebase(paths, !!cmd.commit, cmd.files, cmd.forceTsx, cmd.requireFlowPragma);
    }
  );

program
  .command("ignore-errors")
  .option("-c, --commit")
  .option(
    "--no-ignore-jsx",
    "Don't insert ignores into JSX, since they may cause runtime changes"
  )
  .option(
    "--exclude <list>",
    "A comma-seperated list of strings to exclude",
    (f: string) => f.split(",")
  )
  .action(
    (cmd: {
      commit: boolean | undefined;
      exclude: string[] | undefined;
      noIgnoreJSX: boolean;
    }) => {
      console.log("Ignoring Typescript errors...");
      const paths = {
        ...filePaths,
        exclude: [...filePaths.exclude, ...(cmd.exclude || [])]
      };
      console.log(paths);

      ignoreErrors(paths, !!cmd.commit, !cmd.noIgnoreJSX);
    }
  );

program
  .command("check-types")
  .option("-c, --commit")
  .action(() => {
    console.log("Checking Typescript types and skipping ignored files...");

    checkTypes(filePaths);
  });

program
  .command("strip-unchecked-flow-types")
  .option("-c, --commit")
  .action((cmd: { commit: boolean | undefined }) => {
    console.log("Stripping Flow annotations from files without @flow pragma...")
    const paths = {
      ...filePaths,
      extensions: [".js", ".jsx"]
    };
    console.log(paths);
    stripUncheckedFlowTypes(paths, !!cmd.commit);
  })

program.parse(process.argv);
