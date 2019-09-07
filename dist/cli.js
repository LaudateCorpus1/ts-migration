"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const tsCompilerHelpers_1 = require("./tsCompilerHelpers");
const stripCommentsRunner_1 = __importDefault(require("./stripCommentsRunner"));
const ignoreErrorsRunner_1 = __importDefault(require("./ignoreErrorsRunner"));
const ignoreFileErrorsRunner_1 = __importDefault(require("./ignoreFileErrorsRunner"));
const convertCodebase_1 = __importDefault(require("./convertCodebase"));
const checkRunner_1 = __importDefault(require("./checkRunner"));
const runner_1 = __importDefault(require("./stripUncheckedFlowTypes/runner"));
const rootDir = process.cwd();
const { configJSON } = tsCompilerHelpers_1.createTSCompiler(rootDir);
const filePaths = {
    rootDir,
    include: configJSON.config.include || ["/"],
    exclude: ["node_modules", ...(configJSON.config.exclude || [])],
    extensions: [".ts", ".tsx"]
};
commander_1.default
    .command("strip-comments")
    .option("-c, --commit")
    .option("--comments <list>", "A comma-seperated list of comments to strip. Must start with `//`", (f) => f.split(","))
    .action((cmd) => {
    console.log("Stripping comments from files...");
    if (cmd.comments)
        console.log("Removing comments: ", cmd.comments);
    stripCommentsRunner_1.default(filePaths, cmd.comments, !!cmd.commit);
});
commander_1.default
    .command("convert-codebase")
    .option("-c, --commit")
    // TODO support directory?
    .option("--files <list>", "A comma-seperated list of files to convert", (f) => f.split(","))
    .option("--exclude <list>", "A comma-seperated list of strings to exclude", (f) => f.split(","))
    .option("--no-force-tsx", "Use a .ts extension if there is no JSX")
    .option("--no-require-flow-pragma", "Convert all files even if they don't have a @flow comment")
    .action((cmd) => {
    console.log("Converting the codebase from Flow to Typescript");
    const paths = Object.assign(Object.assign({}, filePaths), { exclude: [...filePaths.exclude, ...(cmd.exclude || [])], extensions: [".js", ".jsx"] });
    console.log(paths);
    convertCodebase_1.default(paths, !!cmd.commit, cmd.files, cmd.forceTsx, cmd.requireFlowPragma);
});
commander_1.default
    .command("ignore-errors")
    .option("-c, --commit")
    .option("--includeJSX", "Insert ignores into JSX -- may cause runtime changes!", true)
    .option("--exclude <list>", "A comma-seperated list of strings to exclude", (f) => f.split(","))
    .action((cmd) => {
    console.log("Ignoring Typescript errors...");
    const paths = Object.assign(Object.assign({}, filePaths), { exclude: [...filePaths.exclude, ...(cmd.exclude || [])] });
    console.log(paths);
    ignoreErrorsRunner_1.default(paths, !!cmd.commit, cmd.includeJSX);
});
commander_1.default
    .command("ignore-file-errors")
    .option("-c, --commit")
    .action((cmd) => {
    console.log("Inserting custom ts-ignore pragmas...");
    ignoreFileErrorsRunner_1.default(filePaths, !!cmd.commit);
});
commander_1.default
    .command("check-types")
    .option("-c, --commit")
    .action(() => {
    console.log("Checking Typescript types and skipping ignored files...");
    checkRunner_1.default(filePaths);
});
commander_1.default
    .command("strip-unchecked-flow-types")
    .option("-c, --commit")
    .action((cmd) => {
    console.log("Stripping Flow annotations from files without @flow pragma...");
    const paths = Object.assign(Object.assign({}, filePaths), { extensions: [".js", ".jsx"] });
    console.log(paths);
    runner_1.default(paths, !!cmd.commit);
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=cli.js.map