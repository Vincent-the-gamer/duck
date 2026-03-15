import { inflateZlib } from '../utils/pako';
import { extractValidRGB } from './image-processor';

export async function extractRgbFromPngBinary(
  file: File,
  options: {
    skipWRatio?: number;
    skipHRatio?: number;
  } = {}
): Promise<Uint8Array> {
  const skipWRatio = options.skipWRatio ?? 0.4;
  const skipHRatio = options.skipHRatio ?? 0.08;

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 8) {
    throw new Error('PNG 文件过小');
  }

  const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) {
      throw new Error('PNG 头签名不匹配');
    }
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatParts: Uint8Array[] = [];

  while (offset + 8 <= bytes.length) {
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;
    if (offset + 4 > bytes.length) break;

    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    offset += 4;

    if (offset + length + 4 > bytes.length) break;
    const data = bytes.subarray(offset, offset + length);
    offset += length;
    offset += 4;

    if (type === 'IHDR') {
      if (length < 13) throw new Error('IHDR 长度错误');
      width = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
      height = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!width || !height) {
    throw new Error('未解析到宽高');
  }
  if (bitDepth !== 8) {
    throw new Error('仅支持 8 位 PNG');
  }
  if (colorType !== 2 && colorType !== 6) {
    throw new Error('仅支持 RGB/RGBA PNG');
  }
  if (interlace !== 0) {
    throw new Error('不支持隔行扫描 PNG');
  }

  const channels = colorType === 2 ? 3 : 4;
  let idatSize = 0;
  for (const part of idatParts) {
    idatSize += part.length;
  }
  if (idatSize === 0) {
    throw new Error('未找到 IDAT 数据');
  }

  const idatData = new Uint8Array(idatSize);
  let p = 0;
  for (const part of idatParts) {
    idatData.set(part, p);
    p += part.length;
  }

  const inflated = await inflateZlib(idatData);
  const bpp = channels;
  const stride = width * bpp;
  const expected = (stride + 1) * height;
  if (inflated.length < expected) {
    throw new Error('解压后数据长度不符合预期');
  }

  const raw = new Uint8Array(height * stride);
  let inOff = 0;
  let outOff = 0;

  for (let y = 0; y < height; y++) {
    const filterType = inflated[inOff++];
    if (filterType === 0) {
      for (let i = 0; i < stride; i++) {
        raw[outOff + i] = inflated[inOff + i];
      }
    } else if (filterType === 1) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? raw[outOff + i - bpp] : 0;
        raw[outOff + i] = (inflated[inOff + i] + left) & 0xFF;
      }
    } else if (filterType === 2) {
      for (let i = 0; i < stride; i++) {
        const up = y > 0 ? raw[outOff + i - stride] : 0;
        raw[outOff + i] = (inflated[inOff + i] + up) & 0xFF;
      }
    } else if (filterType === 3) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? raw[outOff + i - bpp] : 0;
        const up = y > 0 ? raw[outOff + i - stride] : 0;
        const val = inflated[inOff + i] + Math.floor((left + up) / 2);
        raw[outOff + i] = val & 0xFF;
      }
    } else if (filterType === 4) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? raw[outOff + i - bpp] : 0;
        const up = y > 0 ? raw[outOff + i - stride] : 0;
        const upLeft = y > 0 && i >= bpp ? raw[outOff + i - stride - bpp] : 0;
        const pa = Math.abs(up - upLeft);
        const pb = Math.abs(left - upLeft);
        const pc = Math.abs(left + up - 2 * upLeft);
        let pr;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        else pr = upLeft;
        raw[outOff + i] = (inflated[inOff + i] + pr) & 0xFF;
      }
    } else {
      throw new Error('不支持的 PNG 滤波类型: ' + filterType);
    }
    inOff += stride;
    outOff += stride;
  }

  const skipW = Math.floor(width * skipWRatio);
  const skipH = Math.floor(height * skipHRatio);

  return extractValidRGB(raw, width, height, skipW, skipH, channels);
}