/**
 * LsbWriter - Writes data into the LSBs of RGB pixel data.
 * Matches the Python implementation from duck_payload_exporter.py.
 *
 * For each byte, bits are written MSB-first, grouped into k-bit chunks,
 * and each chunk replaces the LSB k bits of successive pixel bytes.
 */
export class LsbWriter {
  private pixelData: Uint8Array;
  private k: number;
  private bitMask: number;
  private pixelIdx: number = 0;
  private bitBuffer: number = 0;
  private bitCount: number = 0;

  constructor(pixelData: Uint8Array, k: number) {
    this.pixelData = pixelData;
    this.k = k;
    this.bitMask = (1 << k) - 1;
  }

  /** Write a single byte (MSB-first) into the LSB stream */
  writeByte(byte: number): void {
    for (let i = 7; i >= 0; i--) {
      const bit = (byte >> i) & 1;
      this.bitBuffer = (this.bitBuffer << 1) | bit;
      this.bitCount++;
      if (this.bitCount === this.k) {
        if (this.pixelIdx >= this.pixelData.length) {
          throw new Error("Data exceeds pixel capacity");
        }
        this.pixelData[this.pixelIdx] =
          (this.pixelData[this.pixelIdx] & ~this.bitMask) | this.bitBuffer;
        this.pixelIdx++;
        this.bitCount = 0;
        this.bitBuffer = 0;
      }
    }
  }

  /** Write multiple bytes */
  writeBytes(data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.writeByte(data[i]);
    }
  }

  /** Flush remaining bits (pad with zeros) */
  flush(): void {
    if (this.bitCount > 0) {
      while (this.bitCount < this.k) {
        this.bitBuffer = (this.bitBuffer << 1) | 0;
        this.bitCount++;
      }
      if (this.pixelIdx < this.pixelData.length) {
        this.pixelData[this.pixelIdx] =
          (this.pixelData[this.pixelIdx] & ~this.bitMask) | this.bitBuffer;
        this.pixelIdx++;
      }
      this.bitCount = 0;
      this.bitBuffer = 0;
    }
  }
}
