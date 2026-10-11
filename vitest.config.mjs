// Vitest config: unit tests run in Node, with mocks, stubbed env vars and stubbed globals reset
// after every test so tests stay independent.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same `@/*` → `src/*` alias as jsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.js"],
    mockReset: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
