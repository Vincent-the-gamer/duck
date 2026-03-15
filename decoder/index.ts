import { DEFAULT_CONFIG } from './config';
import { getRgbBytesForStego, extractRgbFromPngBinary, tryExtract, convertBinPngToBytes, decodeNestedPayload } from './core';
import type { DecodeResult, DecodeOptions } from './types';

/**
 * 检测是否为 iOS 大图
 */
export function isBigDuckPng(file: File): boolean {
  if (!file) return false;

  // 检测 iOS (简化版，如果需要更精确的检测可以扩展)
  const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '') ||
                (/Macintosh/.test(navigator?.userAgent || '') && 'ontouchend' in document);

  if (!isIOS) return false;
  if (!file.type || !file.type.startsWith('image/')) return false;
  if (!file.name.toLowerCase().endsWith('.png')) return false;

  const sizeLimit = 3 * 1024 * 1024;
  if (file.size <= sizeLimit) return false;

  return true;
}

/**
 * 获取 RGB 字节数据（自动选择解码方式）
 */
async function getRgbBytes(file: File, options: DecodeOptions = {}): Promise<Uint8Array> {
  if (isBigDuckPng(file)) {
    try {
      const rgb = await extractRgbFromPngBinary(file, {
        skipWRatio: options.skipWRatio,
        skipHRatio: options.skipHRatio
      });
      if (rgb && rgb.length > 0) {
        return rgb;
      }
    } catch (e) {
      // 兼容解码失败，尝试普通解码
    }
  }

  return getRgbBytesForStego(file, {
    skipWRatio: options.skipWRatio,
    skipHRatio: options.skipHRatio
  });
}

/**
 * 处理解码结果，包括 binpng 转换和扩展名处理
 */
 async function processExtractedData(
   ext: string,
   data: Uint8Array
 ): Promise<{ ext: string; data: Uint8Array }> {
   let processedExt = ext;
   let processedData = data;

   if (!processedExt.startsWith('.')) {
     processedExt = '.' + processedExt;
   }

   if (processedExt.toLowerCase().endsWith('.binpng')) {
     try {
       processedData = await convertBinPngToBytes(data);  // ← 加上 await
       const newExt = processedExt.slice(0, -7);
       if (newExt && newExt !== '.') {
         processedExt = newExt;
       } else {
         processedExt = '.mp4';
       }
     } catch (e) {
       // 保持原始数据
     }
   }

   return { ext: processedExt, data: processedData };
 }


/**
 * 主解密函数 - 从图片中提取隐藏数据
 * @param imageFile - 要解密的图片文件
 * @param options - 解密选项
 * @returns 解密结果
 */
export async function decryptDuckImage(
  imageFile: File,
  options: DecodeOptions = {}
): Promise<DecodeResult> {
  const {
    password = '',
    skipWRatio = DEFAULT_CONFIG.WATERMARK_SKIP_W_RATIO,
    skipHRatio = DEFAULT_CONFIG.WATERMARK_SKIP_H_RATIO,
    compressLevels = DEFAULT_CONFIG.COMPRESS_LEVELS
  } = options;

  try {
    // 1. 从图片中提取 RGB 字节数据
    const rgbBytes = await getRgbBytes(imageFile, { skipWRatio, skipHRatio });

    // 2. 尝试不同的压缩级别解码
    let result = null;
    let usedLevel = -1;

    for (const k of compressLevels) {
      try {
        result = await tryExtract(rgbBytes, k, password);
        if (result) {
          usedLevel = k;
          break;
        }
      } catch (e) {
        // 继续尝试下一个级别
        continue;
      }
    }

    if (!result) {
      throw new Error('所有压缩级别解码失败，图片可能不包含隐写数据');
    }

    // 3. 处理解码结果
    let { ext, data, extraData } = result;

    // 处理主数据
    const processed = await processExtractedData(ext, data);
    ext = processed.ext;
    data = processed.data;

    // 4. 处理额外数据（如果存在）
    let processedExtraData = null;
    if (extraData && extraData.ext === 'json') {
      try {
        const jsonStr = new TextDecoder().decode(extraData.data);
        const jsonData = JSON.parse(jsonStr);

        if (jsonData && jsonData.tp === 'qrc') {
          const cVal = await decodeNestedPayload(jsonData.c);
          if (cVal) {
            processedExtraData = {
              type: 'qrc',
              content: cVal
            };
          }
        }
      } catch (e) {
        // 额外数据解析失败，忽略
      }
    }

    // 5. 返回结果
    return {
      success: true,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      extractedExt: ext,
      extractedData: data,
      extractedSize: data.length,
      extraData: processedExtraData,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    return {
      success: false,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      error: error.message
    };
  }
}

/**
 * 从 base64 字符串解密图片中的隐藏数据
 * 支持纯 base64 字符串和 data URL 两种格式：
 *   - 纯 base64：`"iVBORw0KGgo..."`
 *   - data URL：`"data:image/png;base64,iVBORw0KGgo..."`
 *
 * @param base64Input - base64 字符串（纯 base64 或 data URL）
 * @param options - 解密选项（与 decryptDuckImage 相同）
 * @param fileName - 可选文件名，默认为 'image.png'
 * @returns 解密结果
 */
export async function decryptDuckImageFromBase64(
  base64Input: string,
  options: DecodeOptions = {},
  fileName: string = 'image.png'
): Promise<DecodeResult> {
  let base64Data = base64Input.trim();
  let mimeType = 'image/png';

  // 处理 data URL 格式：data:<mime>;base64,<data>
  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/s);
    if (!matches) {
      return {
        success: false,
        fileName,
        fileSize: 0,
        error: '无效的 base64 Data URL 格式，期望格式：data:<mime>;base64,<data>'
      };
    }
    mimeType = matches[1];
    base64Data = matches[2];
  }

  // base64 解码为二进制字节
  let bytes: Uint8Array;
  try {
    const binaryStr = atob(base64Data);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  } catch {
    return {
      success: false,
      fileName,
      fileSize: 0,
      error: '无效的 base64 数据，解码失败'
    };
  }

  // 包装为 File 对象，复用 decryptDuckImage 流程
  const file = new File([bytes], fileName, { type: mimeType });
  return decryptDuckImage(file, options);
}


/**
 * 批量解密多个图片
 * @param files - 图片文件数组
 * @param options - 解密选项
 * @param onProgress - 进度回调
 * @returns 解密结果数组
 */
export async function batchDecryptDuckImages(
  files: File[],
  options: DecodeOptions = {},
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<DecodeResult[]> {
  const results: DecodeResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }

    const result = await decryptDuckImage(file, options);
    results.push(result);
  }

  return results;
}

// 导出所有类型和工具函数
export * from './types';
export * from './utils/array';
export * from './core'