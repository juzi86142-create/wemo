import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  target: "node22",
});
