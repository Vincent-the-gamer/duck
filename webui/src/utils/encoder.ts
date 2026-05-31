/**
 * Browser-side encoder that draws duck on canvas and embeds data.
 * Uses the platform-agnostic encoder core.
 */
import {
  encodeToDuckImage,
  createPixelData,
} from "encoder/src/encoder";
import { drawDuck, getRgbaFromCanvas } from "./duck-canvas";

export interface BrowserEncodeOptions {
  password?: string;
  title?: string;
  compress?: number;
}

/**
 * Encode data into a duck image PNG blob (browser).
 */
export async function encodeDuckBlob(
  rawBytes: Uint8Array,
  ext: string,
  options: BrowserEncodeOptions = {}
): Promise<Blob> {
  const { password = "", title = "", compress = 2 } = options;

  // 1. Draw duck on canvas
  const { canvas, size } = drawDuck(640, title);

  // 2. Get RGBA pixel data
  const rgba = getRgbaFromCanvas(canvas);
  const pixels = createPixelData(rgba, size, size);

  // 3. Encode payload into pixels (modifies in place)
  await encodeToDuckImage(rawBytes, ext, pixels, { password, compress });

  // 4. Put modified pixels back to canvas
  const ctx = canvas.getContext("2d")!;
  const imageData = new ImageData(
    new Uint8ClampedArray(pixels.rgba.buffer, pixels.rgba.byteOffset, pixels.rgba.byteLength),
    size,
    size
  );
  ctx.putImageData(imageData, 0, 0);

  // 5. Convert canvas to PNG blob
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: "image/png" });
  } else {
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/png"
      );
    });
  }
}
