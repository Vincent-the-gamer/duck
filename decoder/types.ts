// types.ts
export interface DecodeResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  extractedExt?: string;
  extractedData?: Uint8Array;
  extractedSize?: number;
  extraData?: DecodedExtraData | null;
  error?: string;
  timestamp?: string;
}

export interface ExtraData {
  ext: string;
  data: Uint8Array;
}

/** 解析后的附加数据（如二维码） */
export interface DecodedExtraData {
  type: string;
  content: string;
}

export interface NestedPayload {
  tp?: string;
  c?: string;
  [key: string]: any;
}

export interface DecodeOptions {
  password?: string;
  skipWRatio?: number;
  skipHRatio?: number;
  compressLevels?: number[];
}
