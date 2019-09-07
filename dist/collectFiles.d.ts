declare type Paths = {
    rootDir: string;
    include: string[];
    exclude: string[];
    extensions: string[];
};
export default function collectFiles(paths: Paths, dir?: string): Promise<string[]>;
export {};
