/**
 * Duck drawer - Generates a cartoon duck image.
 *
 * For Node.js, uses sharp to render an SVG string into a raw RGBA pixel buffer.
 * The drawing matches the Python _build_duck_image from duck_payload_exporter.py.
 */

/**
 * Generate an SVG string for the duck cartoon at the given size.
 * This creates the exact same duck design as the Python reference implementation.
 */
export function generateDuckSvg(size: number, title: string = ""): string {
  const fonts = `font-family="sans-serif"`;

  // Calculate proportions relative to Python version
  const r = (v: number) => v * size;

  // Body
  const bodyX1 = r(0.2);
  const bodyY1 = r(0.35);
  const bodyX2 = r(0.8);
  const bodyY2 = r(0.85);

  // Head
  const headX1 = r(0.35);
  const headY1 = r(0.15);
  const headX2 = r(0.65);
  const headY2 = r(0.45);

  // Wing
  const wingX1 = r(0.4);
  const wingY1 = r(0.55);
  const wingX2 = r(0.75);
  const wingY2 = r(0.75);

  // Beak
  const beakPts = [
    [r(0.65), r(0.32)],
    [r(0.78), r(0.36)],
    [r(0.68), r(0.40)],
    [r(0.60), r(0.38)],
  ];

  // Eyes
  const eyeR = r(0.02);

  // Water arcs
  const arcX1 = r(0.1);
  const arcY1 = r(0.75);
  const arcX2 = r(0.9);
  const arcY2 = r(0.9);

  const titleHtml = title
    ? `<text x="${r(0.06)}" y="${r(0.15)}" font-size="${Math.max(
        12,
        r(0.06)
      )}px" fill="black" ${fonts}>${escapeXml(title).substring(0, 30)}</text>`
    : "";

  const versionText =
    `<text x="${size / 2}" y="${size - r(0.03)}" text-anchor="middle" font-size="${Math.max(
      8,
      r(0.025)
    )}px" fill="white" ${fonts} opacity="0.6">V1.0</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#99CCFF"/>
  <!-- Body -->
  <ellipse cx="${(bodyX1 + bodyX2) / 2}" cy="${(bodyY1 + bodyY2) / 2}" rx="${
    (bodyX2 - bodyX1) / 2
  }" ry="${(bodyY2 - bodyY1) / 2}" fill="#FFDF5E" stroke="#FFBE3C" stroke-width="4"/>
  <!-- Head -->
  <ellipse cx="${(headX1 + headX2) / 2}" cy="${(headY1 + headY2) / 2}" rx="${
    (headX2 - headX1) / 2
  }" ry="${(headY2 - headY1) / 2}" fill="#FFDF5E" stroke="#FFBE3C" stroke-width="4"/>
  <!-- Wing -->
  <ellipse cx="${(wingX1 + wingX2) / 2}" cy="${(wingY1 + wingY2) / 2}" rx="${
    (wingX2 - wingX1) / 2
  }" ry="${(wingY2 - wingY1) / 2}" fill="#FFC846" stroke="#FFBE3C" stroke-width="3"/>
  <!-- Beak -->
  <polygon points="${beakPts.map(([x, y]) => `${x},${y}`).join(" ")}" fill="#FF9933" stroke="#C8781E"/>
  <!-- Eyes -->
  <ellipse cx="${r(0.58)}" cy="${r(0.26)}" rx="${eyeR}" ry="${eyeR}" fill="black"/>
  <ellipse cx="${r(0.49)}" cy="${r(0.26)}" rx="${eyeR}" ry="${eyeR}" fill="black"/>
  <!-- Water arcs -->
  <path d="M ${arcX1} ${(arcY1 + arcY2) / 2} A ${(arcX2 - arcX1) / 2} ${
    (arcY2 - arcY1) / 2
  } 0 0 1 ${arcX2} ${(arcY1 + arcY2) / 2}" fill="none" stroke="white" stroke-width="3" opacity="0.8"/>
  <path d="M ${r(0.15)} ${r(0.82)} A ${r(0.35)} ${
    (r(0.93) - r(0.78)) / 2
  } 0 0 1 ${r(0.85)} ${r(0.82)}" fill="none" stroke="#F0F0F0" stroke-width="2" opacity="0.8"/>
  ${titleHtml}
  ${versionText}
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface DuckImageData {
  /** Raw RGBA pixel data */
  rgba: Uint8Array;
  /** Raw RGB pixel data (no alpha) */
  rgb: Uint8Array;
  width: number;
  height: number;
}

/**
 * Create duck image as raw RGB pixel data.
 * For Node.js, this works with raw buffers (no sharp needed at this stage).
 * The caller is responsible for rendering the SVG and extracting pixels.
 */
export function createDuckRgbBuffer(
  rgbaData: Uint8Array,
  width: number,
  height: number
): DuckImageData {
  // Extract RGB from RGBA
  const rgbSize = width * height * 3;
  const rgb = new Uint8Array(rgbSize);
  let rgbIdx = 0;
  for (let i = 0; i < rgbaData.length; i += 4) {
    rgb[rgbIdx++] = rgbaData[i]; // R
    rgb[rgbIdx++] = rgbaData[i + 1]; // G
    rgb[rgbIdx++] = rgbaData[i + 2]; // B
  }
  return { rgba: rgbaData, rgb, width, height };
}

export { escapeXml };
