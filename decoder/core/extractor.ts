import { LsbStream } from './lsb-stream';
import { decryptData, sha256 } from '../utils/crypto';
import { arraysEqual } from '../utils/array';
import type { ExtraData } from '../types';

export interface ExtractedResult {
  ext: string;
  data: Uint8Array;
  extraData?: ExtraData | null;
}

export async function tryExtract(
  rgbBytes: Uint8Array,
  k: number,
  password: string = ''
): Promise<ExtractedResult> {
  const bitStream = new LsbStream(rgbBytes, k);
  const lenBytes = bitStream.readBytes(4);
  const totalLen = new DataView(lenBytes.buffer).getUint32(0, false);

  if (totalLen === 0 || totalLen > rgbBytes.length) {
    throw new Error(`Invalid length detected: ${totalLen}`);
  }

  const blob = bitStream.readBytes(totalLen);
  let idx = 0;
  if (idx >= blob.length) throw new Error('Empty blob');

  const hasPwd = blob[idx++] === 1;
  let pwdHash: Uint8Array | null = null;
  let salt: Uint8Array | null = null;

  if (hasPwd) {
    if (idx + 48 > blob.length) throw new Error('Header too short for auth');
    pwdHash = blob.slice(idx, idx + 32);
    idx += 32;
    salt = blob.slice(idx, idx + 16);
    idx += 16;
  }

  if (idx >= blob.length) throw new Error('Header too short for ext len');
  const extLen = blob[idx++];
  if (idx + extLen > blob.length) throw new Error('Header too short for ext');
  const extBytes = blob.slice(idx, idx + extLen);
  const ext = new TextDecoder().decode(extBytes);
  idx += extLen;

  if (idx + 4 > blob.length) throw new Error('Header too short for data len');
  const dataLen = new DataView(blob.buffer).getUint32(idx, false);
  idx += 4;
  const data = blob.slice(idx);

  if (data.length !== dataLen) {
    throw new Error(`Data length mismatch. Expected ${dataLen}, got ${data.length}`);
  }

  let finalData = data;
  if (hasPwd) {
    if (!password) {
      throw new Error('File is encrypted but no password provided');
    }
    if (!pwdHash || !salt) {
      throw new Error('Invalid password data');
    }
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const checkKey = new TextEncoder().encode(password + saltHex);
    const checkHashBuf = await sha256(checkKey);
    const checkHash = new Uint8Array(checkHashBuf);

    if (!arraysEqual(checkHash, pwdHash)) {
      throw new Error('Password verification failed');
    }

    finalData = await decryptData(data, password, salt);
  }

  // Try to extract second segment (extra payload)
  let extraData: ExtraData | null = null;
  try {
    const lenBytes2 = bitStream.readBytes(4);
    const totalLen2 = new DataView(lenBytes2.buffer).getUint32(0, false);

    if (totalLen2 > 0 && totalLen2 < rgbBytes.length) {
      const blob2 = bitStream.readBytes(totalLen2);
      let idx2 = 0;
      const hasPwd2 = blob2[idx2++] === 1;

      if (hasPwd2) {
        idx2 += 32 + 16; // Skip hash + salt
      }

      const extLen2 = blob2[idx2++];
      const extBytes2 = blob2.slice(idx2, idx2 + extLen2);
      const ext2 = new TextDecoder().decode(extBytes2);
      idx2 += extLen2;

      const dataLen2 = new DataView(blob2.buffer).getUint32(idx2, false);
      idx2 += 4;
      const data2 = blob2.slice(idx2);

      if (data2.length === dataLen2) {
        extraData = {
          ext: ext2,
          data: data2
        };
      }
    }
  } catch (e) {
    // It's normal to fail if no second segment exists
  }

  return { ext, data: finalData, extraData };
}