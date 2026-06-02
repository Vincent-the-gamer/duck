/**
 * Pre-publish script: remove workspace-only dependencies that are already
 * bundled into dist/ by tsdown (duck-encoder, duck-decoder).
 *
 * npm/pnpm install on the consumer side cannot resolve `workspace:*` protocol,
 * so we strip these before publish and restore after.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "..", "package.json");

const original = readFileSync(pkgPath, "utf-8");
const pkg = JSON.parse(original);

let changed = false;

// Remove workspace-only devDependencies that are already bundled
for (const key of ["duck-encoder", "duck-decoder"]) {
  if (pkg.devDependencies && key in pkg.devDependencies) {
    delete pkg.devDependencies[key];
    changed = true;
  }
}

if (changed) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(
    "✅ Removed duck-encoder and duck-decoder from devDependencies for publish"
  );
}

// Write original content to a restore file so postpublish can put it back
writeFileSync(resolve(__dirname, "..", "package.json.prepublish-backup"), original);
