/**
 * Browser duck image drawer using Canvas API.
 * Matches the Python _build_duck_image and encoder/src/duck-drawer.ts.
 */

export interface DuckCanvasResult {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  size: number;
}

/**
 * Draw the cartoon duck on a canvas.
 * Matches the Python _build_duck_image exactly.
 */
export function drawDuck(size: number, title: string = ""): DuckCanvasResult {
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(size, size)
      : document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  const r = (v: number) => v * size;

  // Background
  ctx.fillStyle = "#99CCFF";
  ctx.fillRect(0, 0, size, size);

  // Body (ellipse)
  ctx.fillStyle = "#FFDF5E";
  ctx.strokeStyle = "#FFBE3C";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(
    r(0.5),
    r(0.6),
    r(0.3),
    r(0.25),
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.ellipse(r(0.5), r(0.3), r(0.15), r(0.15), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wing
  ctx.fillStyle = "#FFC846";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(r(0.575), r(0.65), r(0.175), r(0.1), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Beak
  ctx.fillStyle = "#FF9933";
  ctx.strokeStyle = "#C8781E";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r(0.65), r(0.32));
  ctx.lineTo(r(0.78), r(0.36));
  ctx.lineTo(r(0.68), r(0.4));
  ctx.lineTo(r(0.6), r(0.38));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#000000";
  const eyeR = r(0.02);
  ctx.beginPath();
  ctx.arc(r(0.58), r(0.26), eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r(0.49), r(0.26), eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Water arcs (bottom white lines)
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(r(0.5), r(0.825), r(0.4), Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();

  ctx.strokeStyle = "rgba(240,240,240,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r(0.5), r(0.855), r(0.35), Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();

  // Title
  if (title) {
    const fs = Math.max(12, r(0.06));
    ctx.font = `${fs}px system-ui, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.fillText(title.substring(0, 30), r(0.06), r(0.15));
  }

  // Version
  const fsVer = Math.max(8, r(0.025));
  ctx.font = `${fsVer}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText("V1.0", size / 2, size - r(0.03));
  ctx.textAlign = "start";

  return { canvas, ctx, size };
}

/**
 * Get RGBA pixel data from a canvas.
 */
export function getRgbaFromCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement
): Uint8Array {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return new Uint8Array(imageData.data.buffer);
}
