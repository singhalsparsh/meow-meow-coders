// Minimal typings for the Clang-in-WebAssembly toolchain.
//
// @live-codes/clang-wasm ships its source as plain JS with no .d.ts files, so
// without this the import falls back to an implicit any and trips noImplicitAny.
// The shapes here describe only the surface the judge worker relies on; the
// underlying runtime returns browser WASI objects that are intentionally `any`.
//
// Upstream docs: https://github.com/live-codes/clang-wasm
declare module "@live-codes/clang-wasm/toolchain" {
  export interface Toolchain {
    runtime: any;
    assetSource: string;
    addFile: (path: string, contents: string | Uint8Array) => void;
    lock: <T>(work: () => Promise<T> | T) => Promise<T>;
    captureCompilerOutput: <T>(
      work: () => Promise<T> | T
    ) => Promise<{ result: T; raw: string; error: Error | null }>;
    execute: (
      artifact: any,
      options: Record<string, unknown>
    ) => Promise<{ exitCode: number | null; stdout: string; stderr: string }>;
    dispose: () => void;
  }

  export function createToolchain(options?: {
    baseUrl?: string;
    objectiveCBaseUrl?: string;
    maxAssetBytes?: number;
    onProgress?: (value: number) => void;
  }): Promise<Toolchain>;

  export function compilerDiagnostics(raw: string): string[];

  export const CLANG_DRIVER_DEFAULT_ARGS: string[];
}

declare module "@live-codes/clang-wasm" {
  export function createCompiler(
    language: string,
    options?: Record<string, unknown>
  ): Promise<unknown>;
}
