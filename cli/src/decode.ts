/**
 * Duck Decode CLI handler - Extract hidden data from a duck image (Node.js).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { tryExtract } from "decoder/core";

export interface DecodeActionOptions {
  password?: string;
  out?: string;
}

/**
 * Extract RGB pixel data from a PNG file using sharp.
 * Skips the watermark area (top-left).
 */
async function extractRgbFromPng(
  filePath: string,
  skipWRatio: number = 0.4,
  skipHRatio: number = 0.08
): Promise<{ rgbBytes: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const skipW = Math.floor(width * skipWRatio);
  const skipH = Math.floor(height * skipHRatio);

  const pixelCount = width * height - skipW * skipH;
  const rgbBytes = new Uint8Array(pixelCount * 3);
  let idx = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < skipH && x < skipW) continue;
      const pos = (y * width + x) * channels;
      rgbBytes[idx++] = data[pos];
      rgbBytes[idx++] = data[pos + 1];
      rgbBytes[idx++] = data[pos + 2];
    }
  }

  return { rgbBytes, width, height };
}

/**
 * Convert a binpng (payload stored as PNG pixels) back to raw bytes.
 */
async function convertBinPngToBytes(
  binPngData: Uint8Array
): Promise<Uint8Array> {
  const { data, info } = await sharp(binPngData)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = info.width * info.height * 3;
  const rgbBuf = new Uint8Array(total);
  let idx = 0;
  for (let i = 0; i < data.length; i += 4) {
    rgbBuf[idx++] = data[i];
    rgbBuf[idx++] = data[i + 1];
    rgbBuf[idx++] = data[i + 2];
  }

  let end = rgbBuf.length;
  while (end > 0 && rgbBuf[end - 1] === 0) end--;
  return rgbBuf.subarray(0, end);
}

export async function decodeAction(input: string, options: DecodeActionOptions): Promise<void> {
  const inputPath = resolve(input);

  console.log(`📖 Reading duck image: ${inputPath}`);

  let rawBytes: Buffer;
  try {
    rawBytes = readFileSync(inputPath);
  } catch (err: any) {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
  }

  console.log(`   Size: ${(rawBytes.length / 1024).toFixed(2)} KB`);

  if (options.password) {
    console.log(
      `🔐 Using password: ${"*".repeat(Math.min(options.password.length, 8))}`
    );
  }

  const { rgbBytes } = await extractRgbFromPng(inputPath);

  console.log(`🔍 Decoding...`);
  const startTime = Date.now();

  const compressLevels = [2, 6, 8];
  let result: { ext: string; data: Uint8Array } | null = null;
  let usedLevel = -1;
  const errors: string[] = [];

  for (const k of compressLevels) {
    try {
      const extracted = await tryExtract(rgbBytes, k, options.password || "");
      if (extracted) {
        result = { ext: extracted.ext, data: extracted.data };
        usedLevel = k;
        break;
      }
    } catch (e: any) {
      errors.push(`k=${k}: ${e.message}`);
      continue;
    }
  }

  if (!result) {
    console.error("\n❌ Decoding failed:");
    for (const err of errors) console.error(`   ${err}`);
    process.exit(1);
  }

  console.log(`   Used compress level: k=${usedLevel}`);

  let { ext, data } = result;
  if (!ext.startsWith(".")) ext = "." + ext;

  if (ext.toLowerCase().endsWith(".binpng")) {
    try {
      data = await convertBinPngToBytes(data);
      ext = ext.slice(0, -7) || ".mp4";
      console.log(`   Converted binpng → ${ext}`);
    } catch (e: any) {
      console.error(`   Warning: binpng conversion failed: ${e.message}`);
    }
  }

  const outputPath = options.out
    ? resolve(options.out)
    : resolve(`duck_recovered${ext}`);

  writeFileSync(outputPath, data);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const outSize = (data.length / 1024).toFixed(2);

  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`📁 Output: ${outputPath} (${outSize} KB)`);
  console.log(`   Type: ${ext}`);
}
