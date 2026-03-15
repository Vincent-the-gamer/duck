/**
 * 根据文件名获取 MIME 类型
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // 图片
    'png':  'image/png',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif':  'image/gif',
    'webp': 'image/webp',
    'bmp':  'image/bmp',
    'svg':  'image/svg+xml',
    // 视频
    'mp4':  'video/mp4',
    'm4v':  'video/mp4',
    'mov':  'video/quicktime',
    'webm': 'video/webm',
    'avi':  'video/x-msvideo',
    'mkv':  'video/x-matroska',
    // 音频
    'mp3':  'audio/mpeg',
    'aac':  'audio/aac',
    'm4a':  'audio/mp4',
    'wav':  'audio/wav',
    'ogg':  'audio/ogg',
    // 其他
    'pdf':  'application/pdf',
    'zip':  'application/zip',
    'json': 'application/json',
    'txt':  'text/plain',
  };

  return mimeTypes[extension ?? ''] ?? 'application/octet-stream';
}
