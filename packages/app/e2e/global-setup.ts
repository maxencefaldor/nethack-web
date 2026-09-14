import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const FIXTURE_TILESET = resolve(
  import.meta.dirname,
  "../../../tools/tileset-build/build/fixture",
);

/** Builds a small sprite tileset with the pipeline's placeholder generator, for tests that need one. */
export default function globalSetup(): void {
  if (existsSync(resolve(FIXTURE_TILESET, "manifest.json"))) return;
  const tool = resolve(import.meta.dirname, "../../../tools/tileset-build");
  execFileSync(
    "pnpm",
    ["exec", "tsx", "src/cli.ts", "build", "styles/placeholder.json", FIXTURE_TILESET],
    {
      cwd: tool,
      stdio: "inherit",
    },
  );
}
