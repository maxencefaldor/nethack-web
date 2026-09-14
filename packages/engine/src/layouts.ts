import type { GlyphInfo } from "@nethack-web/protocol";
import type { Memory } from "./memory.js";

/**
 * Byte layouts of the engine structs the bridge reads, for the wasm32 ABI.
 *
 * Offsets follow the field order in the engine headers (wintype.h,
 * func_tab.h). They are checked against the engine's own sizes where the
 * engine gives us a way to do so.
 */

/** struct glyphinfo: int glyph; int ttychar; uint32 framecolor; glyph_map gm { unsigned glyphflags; { int color; int symidx; }; uint32 customcolor; uint16 color256idx; short tileidx; } */
export function readGlyphInfo(memory: Memory, pointer: number): GlyphInfo {
  return {
    glyph: memory.int32(pointer),
    symbol: String.fromCharCode(memory.int32(pointer + 4)),
    frameColor: memory.uint32(pointer + 8),
    flags: memory.uint32(pointer + 12),
    color: memory.int32(pointer + 16),
    symbolIndex: memory.int32(pointer + 20),
    tileIndex: memory.int16(pointer + 30),
  };
}

/** union any: 8 bytes, 8-byte aligned because it holds int64. The engine zeroes it before use, so a 32-bit identifier occupies the low word and the high word is zero. */
export const ANYTHING_HIGH_WORD_OFFSET = 4;

/** struct mi { anything item; long count; unsigned itemflags; } */
export const MENU_ITEM_SIZE = 16;
export const MENU_ITEM_COUNT_OFFSET = 8;
export const MENU_ITEM_FLAGS_OFFSET = 12;

/** struct ext_func_tab { uchar key; const char *ef_txt, *ef_desc; int (*ef_funct)(void); unsigned flags; const char *f_text; } */
export const EXT_FUNC_TAB_SIZE = 24;

export interface ExtendedCommandEntry {
  readonly index: number;
  readonly key: number;
  readonly name: string;
  readonly description: string;
  readonly flags: number;
}

export function readExtendedCommands(memory: Memory, table: number): ExtendedCommandEntry[] {
  const entries: ExtendedCommandEntry[] = [];
  for (let index = 0; ; index += 1) {
    const base = table + index * EXT_FUNC_TAB_SIZE;
    const name = memory.string(memory.pointer(base + 4));
    if (name === null) break;
    entries.push({
      index,
      key: memory.int8(base) & 0xff,
      name,
      description: memory.string(memory.pointer(base + 8)) ?? "",
      flags: memory.uint32(base + 16),
    });
  }
  return entries;
}

/** Capacity of the buffer the engine hands to getlin(). */
export const GETLIN_BUFFER_SIZE = 256;
/** Capacity of the player name field (PL_NSIZ). */
export const PLAYER_NAME_SIZE = 32;
