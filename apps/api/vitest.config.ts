import { defineConfig } from "vitest/config";
import istanbul from "@vitest/coverage-istanbul";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Database integration suites reset the same explicitly selected test DB.
    // Run files serially so each suite owns a clean fixture for its lifecycle.
    fileParallelism: false,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "../../coverage/api", // 输出到项目根目录coverage/api
    },
  },
});
