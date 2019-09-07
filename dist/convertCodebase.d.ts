import { FilePaths } from "./cli";
export default function process(filePaths: FilePaths, shouldCommit: boolean, filesFromCLI: string[] | undefined, forceTsx: boolean, requireFlowPragma: boolean): Promise<void>;
