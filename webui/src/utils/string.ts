/**
 * 生成指定长度的随机字符串
 * @param length 字符串长度
 * @returns 随机字符串
 */
export function randomString(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}