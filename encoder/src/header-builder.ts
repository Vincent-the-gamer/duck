import { sha256 } from "duck-decoder/utils/crypto";

/**
 * Generate an XOR key stream from password + salt.
 * Matches the Python _generate_key_stream in duck_payload_exporter.py.
 *
 * Since XOR is symmetric, the same function is used for both encryption and decryption.
 */
async function generateKeyStream(
  password: string,
  salt: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const keyMaterial = new TextEncoder().encode(password + saltHex);

  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;

  while (offset < length) {
    const counterBytes = new TextEncoder().encode(String(counter));
    const combined = new Uint8Array(keyMaterial.length + counterBytes.length);
    combined.set(keyMaterial);
    combined.set(counterBytes, keyMaterial.length);

    const hash = await sha256(combined);
    const chunkLen = Math.min(32, length - offset);
    out.set(hash.subarray(0, chunkLen), offset);
    offset += chunkLen;
    counter++;
  }

  return out;
}

/**
 * Encrypt data with XOR key stream using password + salt.
 * Returns [ciphertext, salt, password_hash, has_password].
 */
async function encryptWithPassword(
  data: Uint8Array,
  password: string
): Promise<{
  cipher: Uint8Array;
  salt: Uint8Array;
  pwdHash: Uint8Array;
  hasPwd: boolean;
}> {
  if (!password) {
    return {
      cipher: data,
      salt: new Uint8Array(0),
      pwdHash: new Uint8Array(0),
      hasPwd: false,
    };
  }

  // Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyStream = await generateKeyStream(password, salt, data.length);

  // XOR encryption
  const cipher = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    cipher[i] = data[i] ^ keyStream[i];
  }

  // Password hash for verification
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const pwdHashBytes = new TextEncoder().encode(password + saltHex);
  const pwdHash = await sha256(pwdHashBytes);

  return { cipher, salt, pwdHash, hasPwd: true };
}

/**
 * Build the file header that gets embedded into the duck image.
 * Format: [has_pwd(1)][pwd_hash(32)][salt(16)][ext_len(1)][ext_bytes][data_len(4)][payload]
 */
export async function buildFileHeader(
  raw: Uint8Array,
  password: string,
  ext: string
): Promise<Uint8Array> {
  const { cipher, salt, pwdHash, hasPwd } = await encryptWithPassword(
    raw,
    password
  );
  const payload = hasPwd ? cipher : raw;
  const extBytes = new TextEncoder().encode(ext);

  // Calculate total header size
  let headerSize = 1; // has_pwd
  if (hasPwd) {
    headerSize += 32 + 16; // pwd_hash + salt
  }
  headerSize += 1; // ext_len
  headerSize += extBytes.length; // ext
  headerSize += 4; // data_len
  headerSize += payload.length; // payload

  const header = new Uint8Array(headerSize);
  const view = new DataView(header.buffer);
  let idx = 0;

  // has_pwd
  header[idx++] = hasPwd ? 1 : 0;

  // pwd_hash + salt
  if (hasPwd) {
    header.set(pwdHash, idx);
    idx += 32;
    header.set(salt, idx);
    idx += 16;
  }

  // ext_len + ext
  header[idx++] = extBytes.length;
  header.set(extBytes, idx);
  idx += extBytes.length;

  // data_len (4 bytes big-endian)
  view.setUint32(idx, payload.length, false);
  idx += 4;

  // payload
  header.set(payload, idx);

  return header;
}
