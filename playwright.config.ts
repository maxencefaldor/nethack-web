import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "packages/app/e2e",
  globalSetup: "./packages/app/e2e/global-setup.ts",
  timeout: 60_000,
  use: { baseURL: "http://localhost:5173", viewport: { width: 1200, height: 760 } },
  webServer: {
    command: "pnpm --filter @nethack-web/app dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
