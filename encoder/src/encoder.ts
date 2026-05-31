import { LsbWriter } from "./lsb-writer";
import { buildFileHeader } from "./header-builder";

// Duck image constants matching Python implementation
export const WATERMARK_SKIP_W_RATIO = 0.4;
export const WATERMARK_SKIP_H_RATIO = 0.08;
export const DUCK_CHANNELS = 3;

/**
 * Calculate the minimum canvas size needed to hold dataLen bytes
 * when embedded with lsbBits bits per channel, excluding the watermark area.
 */
export function requiredCanvasSize(
  dataByteLength: number,
  lsbBits: number
): number {
  let side = 640;
  while (true) {
    const skipW = Math.floor(side * WATERMARK_SKIP_W_RATIO);
    const skipH = Math.floor(side * WATERMARK_SKIP_H_RATIO);
    const excluded = skipW * skipH;
    const usableBits = (side * side - excluded) * DUCK_CHANNELS * lsbBits;
    if (usableBits >= dataByteLength * 8) {
      return side;
    }
    side += 64;
  }
}

/**
 * Fill the watermark skip area (top-left) with data from adjacent region
 * so it looks natural instead of having unfilled duck pixels.
 */
export function fillWatermarkArea(
  rgbData: Uint8Array,
  width: number,
  height: number
): void {
  const skipW = Math.floor(width * WATERMARK_SKIP_W_RATIO);
  const skipH = Math.floor(height * WATERMARK_SKIP_H_RATIO);
  if (skipW <= 0 || skipH <= 0) return;

  const srcW = Math.max(0, width - skipW);
  if (srcW === 0) return;

  for (let y = 0; y < skipH; y++) {
    for (let x = 0; x < skipW; x++) {
      const srcX = skipW + (x % srcW);
      const srcBase = (y * width + srcX) * 3;
      const dstBase = (y * width + x) * 3;
      rgbData[dstBase] = rgbData[srcBase];
      rgbData[dstBase + 1] = rgbData[srcBase + 1];
      rgbData[dstBase + 2] = rgbData[srcBase + 2];
    }
  }
}

export interface DuckPixelData {
  /** RGBA pixel data (modified in place) */
  rgba: Uint8Array;
  /** RGB-only pixel data */
  rgb: Uint8Array;
  width: number;
  height: number;
}

/**
 * Create a DuckPixelData structure from flat RGBA pixel data.
 */
export function createPixelData(
  rgba: Uint8Array,
  width: number,
  height: number
): DuckPixelData {
  const rgbSize = width * height * 3;
  const rgb = new Uint8Array(rgbSize);
  let rgbIdx = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    rgb[rgbIdx++] = rgba[i];
    rgb[rgbIdx++] = rgba[i + 1];
    rgb[rgbIdx++] = rgba[i + 2];
  }
  return { rgba, rgb, width, height };
}

/**
 * Sync RGB changes back to RGBA buffer.
 */
export function syncRgbToRgba(pixels: DuckPixelData): void {
  const { rgba, rgb } = pixels;
  let rgbIdx = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = rgb[rgbIdx++];
    rgba[i + 1] = rgb[rgbIdx++];
    rgba[i + 2] = rgb[rgbIdx++];
  }
}

/**
 * Embed payload data into duck image RGB pixels using LSB steganography.
 * Modifies the pixel data in place.
 * Matches the Python _embed_payload_lsb from duck_payload_exporter.py exactly.
 */
export function embedPayload(
  pixels: DuckPixelData,
  fileHeader: Uint8Array,
  lsbBits: number
): void {
  const { rgb, width, height } = pixels;

  // Create 4-byte length prefix (big-endian)
  const lengthPrefix = new Uint8Array(4);
  new DataView(lengthPrefix.buffer).setUint32(0, fileHeader.length, false);

  // Combine: [length_prefix(4)][file_header]
  const payloadWithLen = new Uint8Array(4 + fileHeader.length);
  payloadWithLen.set(lengthPrefix);
  payloadWithLen.set(fileHeader, 4);

  // Calculate usable capacity
  const skipW = Math.floor(width * WATERMARK_SKIP_W_RATIO);
  const skipH = Math.floor(height * WATERMARK_SKIP_H_RATIO);
  const excluded = skipW * skipH;
  const usablePixels = width * height - excluded;
  const usableBits = usablePixels * DUCK_CHANNELS * lsbBits;
  const totalBits = payloadWithLen.length * 8;

  if (totalBits > usableBits) {
    throw new Error(
      `Data too large: need ${totalBits} bits but only ${usableBits} usable. ` +
        `Increase compress level or reduce data size.`
    );
  }

  // Match Python exactly: convert payload to bits (MSB-first, big-endian bit order)
  const totalBitLen = payloadWithLen.length * 8;
  const groups = Math.ceil(totalBitLen / lsbBits);
  const bitLen = groups * lsbBits;

  const allBits = new Uint8Array(bitLen);
  for (let i = 0; i < payloadWithLen.length; i++) {
    const byte = payloadWithLen[i];
    for (let b = 7; b >= 0; b--) {
      const bitIdx = i * 8 + (7 - b);
      if (bitIdx < totalBitLen) {
        allBits[bitIdx] = (byte >> b) & 1;
      }
    }
  }

  // Group bits into k-bit values and write to LSB positions
  const mask = (1 << lsbBits) - 1;
  for (let g = 0; g < groups; g++) {
    // Compute k-bit value from group (big-endian: first bit is MSB)
    let val = 0;
    for (let b = 0; b < lsbBits; b++) {
      val = (val << 1) | allBits[g * lsbBits + b];
    }

    // Find the pixel at linear index g (skipping watermark area)
    let remaining = g;
    let targetX = 0, targetY = 0, targetC = 0;
    let found = false;
    for (let y = 0; y < height && !found; y++) {
      for (let x = 0; x < width && !found; x++) {
        if (y < skipH && x < skipW) continue;
        for (let c = 0; c < DUCK_CHANNELS && !found; c++) {
          if (remaining === 0) {
            targetX = x;
            targetY = y;
            targetC = c;
            found = true;
          }
          remaining--;
        }
      }
    }

    if (!found) {
      throw new Error("Data exceeds pixel capacity");
    }

    const pos = (targetY * width + targetX) * 3 + targetC;
    rgb[pos] = (rgb[pos] & ~mask) | (val & mask);
  }

  // Fill watermark area with adjacent pixels for natural look
  fillWatermarkArea(rgb, width, height);

  // Sync RGB back to RGBA
  syncRgbToRgba(pixels);
}

export interface EncodeOptions {
  password?: string;
  title?: string;
  compress?: number;
}

/**
 * Encode raw bytes into a duck image (core function, platform-agnostic).
 * Takes pre-rendered duck RGBA pixel data and embeds the payload.
 */
export async function encodeToDuckImage(
  rawBytes: Uint8Array,
  ext: string,
  duckPixels: DuckPixelData,
  options: EncodeOptions = {}
): Promise<void> {
  const { password = "", compress = 2 } = options;
  const lsbBits = compress >= 8 ? 8 : compress >= 6 ? 6 : 2;
  const fileHeader = await buildFileHeader(rawBytes, password, ext);
  embedPayload(duckPixels, fileHeader, lsbBits);
}
