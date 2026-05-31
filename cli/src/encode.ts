/**
 * Duck Encode CLI handler - Hide data inside a duck image.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { encodeDuckPng } from "encoder";

export interface EncodeActionOptions {
  password?: string;
  title?: string;
  compress?: number | string;
  out?: string;
}

export async function encodeAction(input: string, options: EncodeActionOptions): Promise<void> {
  const inputPath = resolve(input);
  const outputPath = resolve(options.out || "duck_payload.png");
  const compress = parseInt(String(options.compress ?? 2), 10);

  if (![2, 6, 8].includes(compress)) {
    console.error("Error: compress must be 2, 6, or 8");
    process.exit(1);
  }

  console.log(`📖 Reading: ${inputPath}`);
  let rawBytes: Buffer;
  try {
    rawBytes = readFileSync(inputPath);
  } catch (err: any) {
    console.error(`Error reading input file: ${err.message}`);
    process.exit(1);
  }

  const inputExt =
    extname(inputPath).toLowerCase().replace(/^\./, "") || "bin";
  console.log(`   Size: ${(rawBytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Type: ${inputExt}`);

  if (options.password) {
    console.log(
      `🔐 Password: ${"*".repeat(Math.min(options.password.length, 8))}`
    );
  }
  if (options.title) {
    console.log(`📝 Title: "${options.title}"`);
  }
  console.log(`📦 Compress: ${compress}-bit LSB`);
  console.log(`🦆 Encoding...`);

  const startTime = Date.now();
  try {
    const pngBuffer = await encodeDuckPng(
      new Uint8Array(
        rawBytes.buffer,
        rawBytes.byteOffset,
        rawBytes.byteLength
      ),
      inputExt,
      {
        password: options.password || "",
        title: options.title || "",
        compress,
      }
    );

    writeFileSync(outputPath, pngBuffer);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const outSize = (pngBuffer.length / 1024).toFixed(2);

    console.log(`\n✅ Done in ${elapsed}s`);
    console.log(`📁 Output: ${outputPath} (${outSize} KB)`);
  } catch (err: any) {
    console.error(`\n❌ Encoding failed: ${err.message}`);
    process.exit(1);
  }
}
