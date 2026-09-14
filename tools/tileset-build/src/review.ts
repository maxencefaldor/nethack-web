import type { CatalogEntry } from "./catalog.ts";

/** A static page showing every tile beside its neighbours, for approving or rejecting by eye. */
export function reviewPage(
  name: string,
  tiles: readonly {
    readonly entry: CatalogEntry;
    readonly file: string;
    readonly prompt: string;
  }[],
): string {
  const cards = tiles
    .map(
      (
        tile,
      ) => `<figure><img src="${tile.file}" alt="${escapeHtml(tile.entry.name)}" width="96" height="96" />
<figcaption><b>${escapeHtml(tile.entry.name)}</b><br /><code>${tile.entry.id}</code><br /><small>${escapeHtml(tile.prompt)}</small></figcaption></figure>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(name)} review</title>
<style>body{font:14px system-ui;background:#111;color:#ddd;margin:24px}h1{font-weight:500}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
figure{margin:0;background:#1a1d20;border:1px solid #333;border-radius:6px;padding:10px}
img{image-rendering:pixelated;background:#0f1113;border-radius:4px}small{color:#888}</style>
<h1>${escapeHtml(name)}: ${tiles.length} tiles</h1><main>${cards}</main>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
