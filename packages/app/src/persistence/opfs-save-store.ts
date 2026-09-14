import type { SaveFile } from "@nethack-web/protocol";
import type { SaveStore } from "./save-store.js";

const ROOT_DIRECTORY = "nethack-web";

/** Durable per-origin storage using the browser's origin private file system. */
export class OpfsSaveStore implements SaveStore {
  static async open(): Promise<OpfsSaveStore | null> {
    if (typeof navigator === "undefined" || !("storage" in navigator)) return null;
    try {
      const root = await navigator.storage.getDirectory();
      return new OpfsSaveStore(await root.getDirectoryHandle(ROOT_DIRECTORY, { create: true }));
    } catch {
      return null;
    }
  }

  private constructor(private readonly root: FileSystemDirectoryHandle) {}

  async list(): Promise<readonly SaveFile[]> {
    const files: SaveFile[] = [];
    await this.walk(this.root, "", files);
    return files;
  }

  async replaceAll(files: readonly SaveFile[]): Promise<void> {
    for await (const name of this.root.keys()) {
      await this.root.removeEntry(name, { recursive: true });
    }
    for (const file of files) {
      const segments = file.path.split("/");
      const name = segments.pop();
      if (name === undefined) continue;
      let directory = this.root;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment, { create: true });
      }
      const handle = await directory.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      const bytes = new Uint8Array(file.bytes.byteLength);
      bytes.set(file.bytes);
      await writable.write(bytes.buffer);
      await writable.close();
    }
  }

  private async walk(
    directory: FileSystemDirectoryHandle,
    prefix: string,
    into: SaveFile[],
  ): Promise<void> {
    for await (const [name, handle] of directory.entries()) {
      const path = prefix === "" ? name : `${prefix}/${name}`;
      if (handle.kind === "directory") {
        await this.walk(handle, path, into);
      } else {
        const file = await handle.getFile();
        into.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
      }
    }
  }
}
