import { ensurePako } from '../utils/pako';

export async function decodeNestedPayload(base64Str: string): Promise<string | null> {
  if (!base64Str) return null;

  try {
    // 1. Base64 Decode
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 2. Gzip Decompress
    await ensurePako();
    const decompressed = (globalThis as any).pako.ungzip(bytes);

    // 3. Parse JSON
    const jsonStr = new TextDecoder().decode(decompressed);
    const innerJson = JSON.parse(jsonStr);

    // 4. Extract 'c'
    return innerJson.c || null;
  } catch (e) {
    console.error('Nested payload decode failed:', e);
    return null;
  }
}