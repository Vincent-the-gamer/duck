export async function convertBinPngToBytes(binPngData: Uint8Array): Promise<Uint8Array> {
  const blob = new Blob([binPngData], { type: 'image/png' });
  const imgBitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.drawImage(imgBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const size = canvas.width * canvas.height * 3;
  const rgbBuffer = new Uint8Array(size);
  let idx = 0;

  for (let i = 0; i < data.length; i += 4) {
    rgbBuffer[idx++] = data[i];
    rgbBuffer[idx++] = data[i + 1];
    rgbBuffer[idx++] = data[i + 2];
  }

  let end = rgbBuffer.length;
  while (end > 0 && rgbBuffer[end - 1] === 0) {
    end--;
  }

  return rgbBuffer.subarray(0, end);
}