/**
 * Post-publish script: restore package.json from backup.
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "..", "package.json");
const backupPath = resolve(__dirname, "..", "package.json.prepublish-backup");

try {
  const backup = readFileSync(backupPath, "utf-8");
  writeFileSync(pkgPath, backup);
  unlinkSync(backupPath);
  console.log("✅ Restored package.json from prepublish backup");
} catch (e) {
  console.warn("⚠️  No prepublish backup found, package.json left as-is");
}
