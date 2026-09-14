import { describe, expect, it } from "vitest";
import { DataLibrary } from "./data-library.js";

const encoder = new TextEncoder();

/** Builds an archive the way makedefs/dlb does, with fixed-width offsets so the header size is known up front. */
function library(files: Record<string, string>): DataLibrary {
  const names = Object.keys(files);
  const contents = names.map((name) => encoder.encode(files[name] ?? ""));
  const stringSpace = names.reduce((total, name) => total + name.length + 1, 0);
  const headerLength = (dataOffset: number, total: number): string => {
    let offset = dataOffset;
    const lines = names.map((name, index) => {
      const line = `n${name.padEnd(12)} ${String(offset).padStart(8)}`;
      offset += contents[index]?.length ?? 0;
      return line;
    });
    return ` 1 ${String(names.length).padStart(4)} ${String(stringSpace).padStart(6)} ${String(dataOffset).padStart(8)} ${String(total).padStart(8)}\n${lines.join("\n")}\n`;
  };
  const provisional = headerLength(0, 0);
  const dataOffset = encoder.encode(provisional).length;
  const total = dataOffset + contents.reduce((sum, bytes) => sum + bytes.length, 0);
  const header = encoder.encode(headerLength(dataOffset, total));
  const bytes = new Uint8Array(total);
  bytes.set(header);
  let cursor = dataOffset;
  for (const chunk of contents) {
    bytes.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new DataLibrary(bytes);
}

describe("DataLibrary", () => {
  it("reads entries by name with sizes derived from neighbouring offsets", () => {
    const data = library({ help: "How to play.\n", hh: "Movement keys\n", license: "Free.\n" });
    expect(data.names()).toEqual(["help", "hh", "license"]);
    expect(data.read("help")).toBe("How to play.\n");
    expect(data.read("hh")).toBe("Movement keys\n");
    expect(data.read("license")).toBe("Free.\n");
    expect(data.read("missing")).toBeNull();
  });

  it("is empty when given no bytes", () => {
    expect(DataLibrary.empty().names()).toEqual([]);
  });
});
