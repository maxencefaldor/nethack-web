/**
 * Type declarations for the Emscripten module produced by build.sh.
 * Copied next to the generated nethack.js so imports of "../dist/nethack.js" resolve.
 */
import type { EmscriptenMemory } from "../src/memory.js";

export interface NetHackFileSystem {
  mkdir(path: string): void;
  readdir(path: string): string[];
  readFile(path: string, options: { encoding: "binary" }): Uint8Array;
  writeFile(path: string, data: Uint8Array | string): void;
  unlink(path: string): void;
  analyzePath(path: string): { exists: boolean };
}

export interface NetHackModule extends EmscriptenMemory {
  ccall(
    name: string,
    returnType: "number" | "string" | "boolean" | null,
    argumentTypes: readonly ("number" | "string" | "boolean" | "array")[],
    args: readonly unknown[],
    options?: { async?: boolean },
  ): unknown;
  ENV: Record<string, string>;
  FS: NetHackFileSystem;
}

export interface NetHackModuleConfig {
  locateFile?(file: string, prefix: string): string;
  arguments?: string[];
  preRun?: Array<(module: NetHackModule) => void>;
  onRuntimeInitialized?(this: NetHackModule): void;
  onExit?(code: number): void;
  onAbort?(reason: unknown): void;
  print?(text: string): void;
  printErr?(text: string): void;
}

export default function createNetHack(config: NetHackModuleConfig): Promise<NetHackModule>;
