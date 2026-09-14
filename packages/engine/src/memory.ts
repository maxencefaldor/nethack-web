/**
 * Typed reads and writes against the engine's linear memory.
 *
 * The Emscripten module exposes `getValue`/`setValue` and string helpers; this
 * wraps them so struct decoding elsewhere reads like the C definitions.
 */
export interface EmscriptenMemory {
  getValue(pointer: number, type: "i8" | "i16" | "i32" | "i64" | "float" | "double" | "*"): number;
  setValue(
    pointer: number,
    value: number,
    type: "i8" | "i16" | "i32" | "i64" | "float" | "double" | "*",
  ): void;
  UTF8ToString(pointer: number, maxBytes?: number): string;
  stringToUTF8(text: string, pointer: number, maxBytes: number): void;
  _malloc(bytes: number): number;
  HEAPU8: Uint8Array;
}

export class Memory {
  constructor(private readonly module: EmscriptenMemory) {}

  int8(pointer: number): number {
    return this.module.getValue(pointer, "i8");
  }

  int16(pointer: number): number {
    return this.module.getValue(pointer, "i16");
  }

  int32(pointer: number): number {
    return this.module.getValue(pointer, "i32");
  }

  uint32(pointer: number): number {
    return this.module.getValue(pointer, "i32") >>> 0;
  }

  pointer(pointer: number): number {
    return this.module.getValue(pointer, "*");
  }

  /** Reads a NUL-terminated string, or null for a null pointer. */
  string(pointer: number): string | null {
    return pointer === 0 ? null : this.module.UTF8ToString(pointer);
  }

  bytes(pointer: number, length: number): Uint8Array {
    return this.module.HEAPU8.slice(pointer, pointer + length);
  }

  writeInt16(pointer: number, value: number): void {
    this.module.setValue(pointer, value, "i16");
  }

  writeInt32(pointer: number, value: number): void {
    this.module.setValue(pointer, value, "i32");
  }

  writePointer(pointer: number, value: number): void {
    this.module.setValue(pointer, value, "*");
  }

  writeBytes(pointer: number, bytes: Uint8Array): void {
    this.module.HEAPU8.set(bytes, pointer);
  }

  /** Writes a string with a terminating NUL, truncated to fit `capacity` bytes. */
  writeString(pointer: number, text: string, capacity: number): void {
    this.module.stringToUTF8(text, pointer, capacity);
  }

  allocate(bytes: number): number {
    const pointer = this.module._malloc(bytes);
    if (pointer === 0) {
      throw new Error(`Engine is out of memory allocating ${bytes} bytes`);
    }
    return pointer;
  }
}
