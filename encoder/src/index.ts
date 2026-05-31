import sharp from "sharp";
import { generateDuckSvg } from "./duck-drawer";
import {
  encodeToDuckImage,
  createPixelData,
  requiredCanvasSize,
} from "./encoder";
import { buildFileHeader } from "./header-builder";

export { generateDuckSvg } from "./duck-drawer";
export {
  encodeToDuckImage,
  createPixelData,
  requiredCanvasSize,
  embedPayload,
  syncRgbToRgba,
  fillWatermarkArea,
} from "./encoder";
export { buildFileHeader } from "./header-builder";
export { LsbWriter } from "./lsb-writer";
export type { EncodeOptions } from "./encoder";
export type { DuckPixelData } from "./encoder";

/**
 * Encode data into a duck image and return the PNG buffer (Node.js).
 *
 * @param rawBytes - The payload data to hide
 * @param ext - File extension (e.g., "png", "mp4.binpng", "txt")
 * @param options - Encoding options
 * @returns PNG buffer of the encoded duck image
 */
export async function encodeDuckPng(
  rawBytes: Uint8Array,
  ext: string,
  options: {
    password?: string;
    title?: string;
    compress?: number;
  } = {}
): Promise<Buffer> {
  const { password = "", title = "", compress = 2 } = options;
  const lsbBits = compress >= 8 ? 8 : compress >= 6 ? 6 : 2;

  // Build file header to calculate required size
  const fileHeader = await buildFileHeader(rawBytes, password, ext);
  const size = requiredCanvasSize(fileHeader.length + 4, lsbBits);

  // 1. Render duck SVG to RGBA pixel buffer using sharp
  const svg = generateDuckSvg(size, title);
  const { data: rgbaData, info } = await sharp(Buffer.from(svg))
    .resize(size, size)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Create pixel data structure
  const pixels = createPixelData(
    new Uint8Array(rgbaData.buffer, rgbaData.byteOffset, rgbaData.byteLength),
    size,
    size
  );

  // 3. Encode payload into pixels (modifies rgba/rgb in place)
  await encodeToDuckImage(rawBytes, ext, pixels, { password, compress });

  // 4. Write RGBA pixel data back to PNG using sharp
  const pngBuffer = await sharp(pixels.rgba, {
    raw: { width: size, height: size, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return pngBuffer;
}
