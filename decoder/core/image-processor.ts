import { DEFAULT_CONFIG } from '../config';

export function extractValidRGB(
  pixelData: Uint8Array,
  w: number,
  h: number,
  skipW: number,
  skipH: number,
  bpp: number = 4
): Uint8Array {
  const size = (w * h - skipW * skipH) * 3;
  const result = new Uint8Array(size);
  let idx = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < skipH && x < skipW) continue;
      const pos = (y * w + x) * bpp;
      result[idx++] = pixelData[pos];
      result[idx++] = pixelData[pos + 1];
      result[idx++] = pixelData[pos + 2];
    }
  }
  return result;
}

export async function getRgbBytesForStego(
  file: File,
  options: {
    skipWRatio?: number;
    skipHRatio?: number;
  } = {}
): Promise<Uint8Array> {
  const skipWRatio = options.skipWRatio ?? DEFAULT_CONFIG.WATERMARK_SKIP_W_RATIO;
  const skipHRatio = options.skipHRatio ?? DEFAULT_CONFIG.WATERMARK_SKIP_H_RATIO;

  const imgBitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.drawImage(imgBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;
  const skipW = Math.floor(w * skipWRatio);
  const skipH = Math.floor(h * skipHRatio);

  return extractValidRGB(imageData.data, w, h, skipW, skipH, 4);
}