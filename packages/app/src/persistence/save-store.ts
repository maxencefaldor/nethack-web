import type { SaveFile } from "@nethack-web/protocol";

/**
 * Where the engine's persistent files live between runs: save games, the
 * high-score record, bones. Paths are relative to the engine's data root.
 */
export interface SaveStore {
  list(): Promise<readonly SaveFile[]>;
  /** Makes the store hold exactly these files. */
  replaceAll(files: readonly SaveFile[]): Promise<void>;
}

/** Keeps files only for the lifetime of the page; used when no durable store is available. */
export class MemorySaveStore implements SaveStore {
  private files: readonly SaveFile[] = [];

  list(): Promise<readonly SaveFile[]> {
    return Promise.resolve(this.files);
  }

  replaceAll(files: readonly SaveFile[]): Promise<void> {
    this.files = files.map((file) => ({ path: file.path, bytes: file.bytes.slice() }));
    return Promise.resolve();
  }
}
