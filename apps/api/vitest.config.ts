import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Database integration suites reset the same explicitly selected test DB.
    // Run files serially so each suite owns a clean fixture for its lifecycle.
    fileParallelism: false,
  },
});
