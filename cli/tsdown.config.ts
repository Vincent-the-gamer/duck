import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  clean: true,
  format: ['esm'],
  dts: true,
  shims: true,
  // Bundle duck-encoder and duck-decoder into the CLI output,
  // but keep other deps (sharp, cac, restore-cursor) as external.
  deps: {
    alwaysBundle: ['duck-encoder', 'duck-decoder'],
  },
})
