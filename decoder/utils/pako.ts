let pakoLoadPromise: Promise<void> | null = null;

export function ensurePako(): Promise<void> {
  if ((globalThis as any).pako) {
    return Promise.resolve();
  }
  if (pakoLoadPromise) {
    return pakoLoadPromise;
  }

  pakoLoadPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('pako loading not supported in non-browser environment'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
    script.onload = () => {
      if ((globalThis as any).pako) {
        resolve();
      } else {
        reject(new Error('pako 加载完成但未找到全局对象'));
      }
    };
    script.onerror = () => {
      reject(new Error('pako 脚本加载失败'));
    };
    document.head.appendChild(script);
  });
  return pakoLoadPromise;
}

export async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  await ensurePako();
  try {
    const out = (globalThis as any).pako.inflate(data);
    if (out instanceof Uint8Array) {
      return out;
    }
    return new Uint8Array(out);
  } catch (e: any) {
    throw new Error('zlib 解压失败: ' + e.message);
  }
}