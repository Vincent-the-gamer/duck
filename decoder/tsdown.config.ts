import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./index.ts", "./core/index.ts", "./utils/crypto.ts"],
  clean: true,
  format: ["esm"],
  dts: true,
  minify: true,
  shims: true,
});
