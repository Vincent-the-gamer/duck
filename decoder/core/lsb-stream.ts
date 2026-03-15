export class LsbStream {
  private rgbBytes: Uint8Array;
  private k: number;
  private bitMask: number;
  private rgbIdx: number = 0;
  private bitBuffer: number = 0;
  private bitCount: number = 0;

  constructor(rgbBytes: Uint8Array, k: number) {
    this.rgbBytes = rgbBytes;
    this.k = k;
    this.bitMask = (1 << k) - 1;
  }

  readBytes(count: number): Uint8Array {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.readByte();
    }
    return result;
  }

  readByte(): number {
    while (this.bitCount < 8) {
      if (this.rgbIdx >= this.rgbBytes.length) {
        throw new Error('Unexpected end of stream');
      }
      const val = this.rgbBytes[this.rgbIdx++] & this.bitMask;
      this.bitBuffer = (this.bitBuffer << this.k) | val;
      this.bitCount += this.k;
    }
    const shift = this.bitCount - 8;
    const byte = (this.bitBuffer >>> shift) & 0xFF;
    this.bitCount -= 8;
    this.bitBuffer &= (1 << this.bitCount) - 1;
    return byte;
  }
}