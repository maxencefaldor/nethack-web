import type {
  EngineCatalog,
  EngineConstants,
  EngineEvent,
  EngineReplies,
  EngineRequest,
  EngineRequestType,
  EngineToHostMessage,
  GlyphInfo,
  MenuEntry,
  MenuSelectionMode,
  StatusField,
  TextAttributes,
  WindowId,
  WindowKind,
} from "@nethack-web/protocol";
import { decodeMixedText, Vocabulary } from "@nethack-web/protocol";
import type { DataLibrary } from "./data-library.js";
import {
  ANYTHING_HIGH_WORD_OFFSET,
  GETLIN_BUFFER_SIZE,
  MENU_ITEM_COUNT_OFFSET,
  MENU_ITEM_FLAGS_OFFSET,
  MENU_ITEM_SIZE,
  PLAYER_NAME_SIZE,
  readExtendedCommands,
  readGlyphInfo,
} from "./layouts.js";
import type { Memory } from "./memory.js";

/** The tables the engine publishes on `globalThis.nethackGlobal` when it boots. */
export interface NetHackGlobal {
  constants: EngineConstants;
  pointers: Record<string, number>;
  globals: {
    svp: { plname: string };
    flags: { initrole: number; initrace: number; initgend: number; initalign: number };
    WIN_MAP: number;
    WIN_MESSAGE: number;
    WIN_INVEN: number;
    WIN_STATUS: number;
  };
}

/** How the bridge talks to the host thread. */
export interface BridgeTransport {
  post(message: EngineToHostMessage): void;
  /** The engine has torn down its windows; the process is about to end. */
  finished(): void;
}

const ESCAPE = 0x1b;

/**
 * Translates raw shim windowport calls into protocol events and requests.
 *
 * One method per windowport call, named exactly as the engine names it, so
 * the dispatch table doubles as an index into doc/window.txt. Events are
 * queued and flushed to the host in batches; requests flush the queue first
 * and then suspend the engine until the host replies.
 */
export class Bridge {
  private readonly queue: EngineEvent[] = [];
  private readonly pending = new Map<number, (reply: unknown) => void>();
  private readonly menus = new Map<WindowId, MenuEntry[]>();
  private readonly windowKinds = new Map<WindowId, WindowKind>();
  private nextWindowId = 1;
  private nextRequestId = 1;
  private vocabulary: Vocabulary | null = null;
  private noGlyph = -1;

  constructor(
    private readonly memory: Memory,
    private readonly transport: BridgeTransport,
    private readonly library: DataLibrary,
    private readonly engineVersion: string,
    private readonly global: () => NetHackGlobal,
  ) {}

  /** Entry point registered on `globalThis` for the shim to call. */
  handle(name: string, args: unknown[]): Promise<unknown> {
    const handler = this.handlers[name];
    if (handler === undefined) {
      console.warn(`Unhandled windowport call ${name}`, args);
      return Promise.resolve(0);
    }
    return Promise.resolve((handler as (...args: unknown[]) => unknown)(...args));
  }

  deliverReply(id: number, reply: unknown): void {
    const resolve = this.pending.get(id);
    if (resolve === undefined) {
      throw new Error(`No pending engine request with id ${id}`);
    }
    this.pending.delete(id);
    resolve(reply);
  }

  flush(): void {
    if (this.queue.length === 0) return;
    this.transport.post({ kind: "events", events: this.queue.splice(0) });
  }

  private emit(event: EngineEvent): void {
    this.queue.push(event);
  }

  private request<T extends EngineRequestType>(
    request: Extract<EngineRequest, { type: T }>,
  ): Promise<EngineReplies[T]> {
    this.flush();
    const id = this.nextRequestId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve as (reply: unknown) => void);
      this.transport.post({ kind: "request", id, request });
    });
  }

  private vocab(): Vocabulary {
    if (this.vocabulary === null) {
      throw new Error("Engine constants are not available before init_nhwindows");
    }
    return this.vocabulary;
  }

  private publishCatalog(): void {
    const global = this.global();
    this.vocabulary = new Vocabulary(global.constants);
    this.noGlyph = this.vocabulary.number("GLYPH", "NO_GLYPH");
    const catalog: EngineCatalog = {
      version: this.engineVersion,
      constants: global.constants,
      extendedCommands: readExtendedCommands(this.memory, global.pointers["extcmdlist"] ?? 0),
    };
    this.transport.post({ kind: "catalog", catalog });
  }

  private decodeAttributes(attr: number): TextAttributes {
    const vocab = this.vocab();
    const urgent = (attr & vocab.number("ATTR", "ATR_URGENT")) !== 0;
    const noHistory = (attr & vocab.number("ATTR", "ATR_NOHISTORY")) !== 0;
    const style =
      attr & ~(vocab.number("ATTR", "ATR_URGENT") | vocab.number("ATTR", "ATR_NOHISTORY"));
    const styles: Record<string, TextAttributes["style"]> = {
      ATR_NONE: "none",
      ATR_BOLD: "bold",
      ATR_DIM: "dim",
      ATR_ITALIC: "italic",
      ATR_ULINE: "underline",
      ATR_BLINK: "blink",
      ATR_INVERSE: "inverse",
    };
    return { style: styles[vocab.name("ATTR", style) ?? "ATR_NONE"] ?? "none", urgent, noHistory };
  }

  private decodeWindowKind(type: number): WindowKind {
    const kinds: Record<string, WindowKind> = {
      NHW_MESSAGE: "message",
      NHW_STATUS: "status",
      NHW_MAP: "map",
      NHW_MENU: "menu",
      NHW_TEXT: "text",
    };
    return kinds[this.vocab().name("WIN_TYPE", type) ?? ""] ?? "inventory";
  }

  private decodeSelectionMode(how: number): MenuSelectionMode {
    const modes: Record<string, MenuSelectionMode> = {
      PICK_NONE: "none",
      PICK_ONE: "one",
      PICK_ANY: "any",
    };
    return modes[this.vocab().name("MENU_SELECT", how) ?? ""] ?? "none";
  }

  private decodeStatusField(index: number): StatusField {
    const name = this.vocab().name("STATUS_FIELD", index);
    if (name === undefined || !name.startsWith("BL_")) {
      throw new Error(`Unknown status field index ${index}`);
    }
    return name.slice(3) as StatusField;
  }

  /** The engine keeps its permanent inventory in an ordinary menu window it names WIN_INVEN. */
  private isInventoryWindow(window: WindowId): boolean {
    return window === this.global().globals.WIN_INVEN;
  }

  private readGlyph(pointer: number): GlyphInfo | null {
    if (pointer === 0) return null;
    const glyph = readGlyphInfo(this.memory, pointer);
    return glyph.glyph === this.noGlyph ? null : glyph;
  }

  private readonly handlers: Record<string, (...args: never[]) => unknown> = {
    shim_init_nhwindows: () => {
      this.publishCatalog();
      this.emit({ type: "initWindows" });
    },
    shim_player_selection_or_tty: async () => {
      const reply = await this.request({ type: "playerSelection" });
      if ("useEngineMenus" in reply) return true;
      const flags = this.global().globals.flags;
      flags.initrole = reply.role;
      flags.initrace = reply.race;
      flags.initgend = reply.gender;
      flags.initalign = reply.alignment;
      return false;
    },
    shim_askname: async () => {
      const reply = await this.request({ type: "askName" });
      this.global().globals.svp.plname = reply.name.slice(0, PLAYER_NAME_SIZE - 1);
    },
    shim_get_nh_event: () => undefined,
    shim_exit_nhwindows: (message: string) => {
      this.emit({ type: "exitWindows", message: message === "" ? null : message });
      this.flush();
      this.transport.finished();
    },
    shim_suspend_nhwindows: (message: string) => {
      this.emit({ type: "suspendWindows", message: message === "" ? null : message });
    },
    shim_resume_nhwindows: () => this.emit({ type: "resumeWindows" }),
    shim_create_nhwindow: (type: number) => {
      const window = this.nextWindowId++;
      const kind = this.decodeWindowKind(type);
      this.windowKinds.set(window, kind);
      this.emit({ type: "createWindow", window, kind });
      return window;
    },
    shim_clear_nhwindow: (window: WindowId) => this.emit({ type: "clearWindow", window }),
    shim_display_nhwindow: async (window: WindowId, blocking: boolean) => {
      if (blocking) {
        await this.request({ type: "displayWindowBlocking", window });
      } else {
        this.emit({ type: "displayWindow", window });
      }
    },
    shim_destroy_nhwindow: (window: WindowId) => {
      this.menus.delete(window);
      this.windowKinds.delete(window);
      this.emit({ type: "destroyWindow", window });
    },
    shim_curs: (window: WindowId, x: number, y: number) =>
      this.emit({ type: "moveCursor", window, x, y }),
    shim_putstr: (window: WindowId, attr: number, text: string) =>
      this.emit({ type: "putString", window, attributes: this.decodeAttributes(attr), text }),
    shim_display_file: async (name: string, complain: boolean) => {
      const text = this.library.read(name);
      if (text === null && !complain) return;
      await this.request({ type: "displayFile", name, text });
    },
    shim_start_menu: (window: WindowId, behavior: number) => {
      this.menus.set(window, []);
      this.emit({
        type: "startMenu",
        window,
        permanentInventory: (behavior & 1) !== 0 || this.isInventoryWindow(window),
      });
    },
    shim_add_menu: (
      window: WindowId,
      glyphPointer: number,
      identifier: number,
      accelerator: number,
      groupAccelerator: number,
      attr: number,
      color: number,
      text: string,
      itemFlags: number,
    ) => {
      // The shim declares the identifier as an int, so what arrives is the
      // first word of the `anything` union rather than its address.
      const entry: MenuEntry = {
        identifier: identifier === 0 ? null : identifier,
        accelerator: String.fromCharCode(accelerator & 0xff),
        groupAccelerator: String.fromCharCode(groupAccelerator & 0xff),
        attributes: this.decodeAttributes(attr),
        color,
        text,
        glyph: this.readGlyph(glyphPointer),
        preselected: (itemFlags & 1) !== 0,
      };
      this.menus.get(window)?.push(entry);
      this.emit({ type: "addMenuEntry", window, entry });
    },
    shim_end_menu: (window: WindowId, prompt: string) =>
      this.emit({ type: "endMenu", window, prompt: prompt === "" ? null : prompt }),
    shim_select_menu: async (window: WindowId, how: number, listPointer: number) => {
      // The permanent inventory window is display-only: the engine shows it
      // as a menu nobody can pick from, and the tty interface never blocks.
      if (this.isInventoryWindow(window)) {
        this.memory.writePointer(listPointer, 0);
        return 0;
      }
      const reply = await this.request({
        type: "selectMenu",
        window,
        mode: this.decodeSelectionMode(how),
      });
      if ("cancelled" in reply) {
        this.memory.writePointer(listPointer, 0);
        return -1;
      }
      const count = reply.selections.length;
      if (count === 0) {
        this.memory.writePointer(listPointer, 0);
        return 0;
      }
      const base = this.memory.allocate(count * MENU_ITEM_SIZE);
      reply.selections.forEach((selection, index) => {
        const item = base + index * MENU_ITEM_SIZE;
        this.memory.writeInt32(item, selection.identifier);
        this.memory.writeInt32(item + ANYTHING_HIGH_WORD_OFFSET, 0);
        this.memory.writeInt32(item + MENU_ITEM_COUNT_OFFSET, selection.count ?? -1);
        this.memory.writeInt32(item + MENU_ITEM_FLAGS_OFFSET, 0);
      });
      this.memory.writePointer(listPointer, base);
      return count;
    },
    shim_message_menu: async (letter: string, how: number, message: string) => {
      const reply = await this.request({
        type: "messageMenu",
        letter,
        mode: this.decodeSelectionMode(how),
        message,
      });
      return reply.letter.charCodeAt(0) || 0;
    },
    shim_mark_synch: () => undefined,
    shim_wait_synch: () => undefined,
    shim_cliparound: (x: number, y: number) => this.emit({ type: "clipAround", x, y }),
    shim_update_positionbar: (features: string) =>
      this.emit({ type: "updatePositionBar", features }),
    shim_print_glyph: (
      window: WindowId,
      x: number,
      y: number,
      glyphPointer: number,
      backgroundPointer: number,
    ) => {
      const glyph = this.readGlyph(glyphPointer);
      if (glyph === null) return;
      this.emit({
        type: "printGlyph",
        window,
        x,
        y,
        glyph,
        background: this.readGlyph(backgroundPointer),
      });
    },
    shim_raw_print: (text: string) => this.emit({ type: "rawPrint", text, bold: false }),
    shim_raw_print_bold: (text: string) => this.emit({ type: "rawPrint", text, bold: true }),
    shim_nhgetch: async () => (await this.request({ type: "getKey" })).key,
    shim_nh_poskey: async (xPointer: number, yPointer: number, modPointer: number) => {
      const reply = await this.request({ type: "getKeyOrPosition" });
      if ("key" in reply) return reply.key;
      this.memory.writeInt16(xPointer, reply.x);
      this.memory.writeInt16(yPointer, reply.y);
      this.memory.writeInt32(modPointer, reply.button);
      return 0;
    },
    shim_nhbell: () => this.emit({ type: "bell" }),
    shim_doprev_message: async () => {
      await this.request({ type: "previousMessage" });
      return 0;
    },
    shim_yn_function: async (question: string, choices: string, defaultChoice: number) => {
      const reply = await this.request({
        type: "yesNo",
        question,
        choices: choices === "" ? null : choices,
        defaultChoice: defaultChoice === 0 ? "" : String.fromCharCode(defaultChoice & 0xff),
      });
      return reply.answer.charCodeAt(0) || ESCAPE;
    },
    shim_getlin: async (question: string, bufferPointer: number) => {
      const reply = await this.request({ type: "getLine", question });
      const text = "cancelled" in reply ? String.fromCharCode(ESCAPE) : reply.text;
      this.memory.writeString(bufferPointer, text, GETLIN_BUFFER_SIZE);
    },
    shim_get_ext_cmd: async () => {
      const reply = await this.request({ type: "getExtendedCommand" });
      return "cancelled" in reply ? -1 : reply.index;
    },
    shim_number_pad: (state: number) => this.emit({ type: "numberPad", state }),
    shim_delay_output: async () => {
      this.flush();
      await new Promise((resolve) => setTimeout(resolve, 50));
    },
    shim_change_color: () => undefined,
    shim_change_background: () => undefined,
    set_shim_font_name: () => 0,
    shim_get_color_string: () => "",
    shim_preference_update: (pointer: number) =>
      this.emit({ type: "preferenceUpdate", preference: this.memory.string(pointer) ?? "" }),
    // Returning an empty string leaves the engine's null pointer untouched,
    // which it reads as "no more history". Message history lives on the host.
    shim_getmsghistory: () => "",
    shim_putmsghistory: (text: string, restoring: boolean) =>
      this.emit({ type: "putMessageHistory", text, restoring }),
    shim_status_init: () => this.emit({ type: "statusInit" }),
    shim_status_enablefield: (
      field: number,
      namePointer: number,
      formatPointer: number,
      enabled: boolean,
    ) =>
      this.emit({
        type: "statusEnableField",
        field: this.decodeStatusField(field),
        name: this.memory.string(namePointer) ?? "",
        format: this.memory.string(formatPointer) ?? "",
        enabled,
      }),
    shim_status_update: (
      field: number,
      pointer: number,
      change: number,
      percent: number,
      color: number,
      colorMasksPointer: number,
    ) => {
      const vocab = this.vocab();
      if (field === vocab.number("STATUS_FIELD", "BL_FLUSH")) {
        this.emit({ type: "statusFlush" });
        return;
      }
      if (field === vocab.number("STATUS_FIELD", "BL_RESET")) {
        this.emit({ type: "statusReset" });
        return;
      }
      if (field === vocab.number("STATUS_FIELD", "BL_CONDITION")) {
        const maskCount = vocab.number("COLOR_ATTR", "BL_ATTCLR_MAX");
        const colorMasks: number[] = [];
        for (let index = 0; index < maskCount; index += 1) {
          colorMasks.push(
            colorMasksPointer === 0 ? 0 : this.memory.uint32(colorMasksPointer + index * 4),
          );
        }
        this.emit({
          type: "statusConditions",
          conditions: this.memory.uint32(pointer),
          colorMasks,
        });
        return;
      }
      const mixed = decodeMixedText(this.memory.string(pointer) ?? "");
      this.emit({
        type: "statusUpdate",
        field: this.decodeStatusField(field),
        text: mixed.text,
        glyph: mixed.glyphs[0] ?? null,
        change,
        percent,
        highlight: { color: color & 0xff, attribute: color >> 8 },
      });
    },
  };
}
