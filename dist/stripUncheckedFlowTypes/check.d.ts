declare type CheckResult = {
    ok: false;
} | {
    ok: true;
    shouldStrip: boolean;
};
export default function checkCode(code: string): CheckResult;
export {};
