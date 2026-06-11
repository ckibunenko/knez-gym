"use client";

import { createWorker, PSM, type Worker } from "tesseract.js";
import { extractDate } from "./parseWorkout";

// Fully local OCR: tesseract.js runs in the browser (WASM). The screenshots
// are light text on a dark UI, which Tesseract reads poorly — so we upscale,
// grayscale, invert when dark, and stretch contrast before recognition.
//
// NOTE: keep the contrast stretch gentle and centered on mid-gray. An
// aggressive percentile-based stretch was tried and it saturated the green
// date badge (white-on-green became flat), silently losing workout dates.

function preprocess(bitmap: ImageBitmap): HTMLCanvasElement {
  const targetWidth = Math.min(Math.max(bitmap.width * 2, 1400), 2600);
  const scale = targetWidth / bitmap.width;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  let totalLum = 0;
  for (let i = 0; i < d.length; i += 4) {
    totalLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const avgLum = totalLum / (d.length / 4);
  const invert = avgLum < 128;

  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (invert) g = 255 - g;
    g = Math.max(0, Math.min(255, (g - 128) * 1.5 + 128));
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ── Date badge pass ─────────────────────────────────────────────────
//
// The full-page pass reliably reads exercise names and numbers but almost
// never the small white-on-green date badge in the header. The primary
// pass locates the badge by its green color on the ORIGINAL pixels (so
// browser/Node resampling differences can't move it), crops exactly it,
// upscales to a comfortable glyph size, and reads it as a single line
// with a small threshold ladder + voting. A full-strip ladder remains as
// fallback when no green badge is found.
// Validated against the user's real screenshots: 13/13 dates correct.

interface BadgeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function isGreen(r: number, g: number, b: number): boolean {
  return g > 60 && r < g * 0.8 && b < g * 0.9;
}

/**
 * Bounding box of the green date badge inside the header strip. Rows are
 * kept only when their green run is badge-sized — the full-width green
 * underline and stray noise are rejected.
 */
function findBadgeBox(bitmap: ImageBitmap): BadgeBox | null {
  const stripH = Math.min(Math.round(bitmap.width * 0.2), bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = stripH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, stripH);

  const w = bitmap.width;
  let minX = w;
  let maxX = -1;
  let minY = stripH;
  let maxY = -1;
  let total = 0;
  for (let y = 0; y < stripH; y++) {
    let rowCount = 0;
    let rowMin = w;
    let rowMax = -1;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isGreen(data[i], data[i + 1], data[i + 2])) {
        rowCount += 1;
        if (x < rowMin) rowMin = x;
        if (x > rowMax) rowMax = x;
      }
    }
    if (rowCount >= w * 0.04 && rowCount <= w * 0.5) {
      if (rowMin < minX) minX = rowMin;
      if (rowMax > maxX) maxX = rowMax;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      total += rowCount;
    }
  }
  if (maxX < 0 || total < 60) return null;

  const pad = 3;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  return {
    left,
    top,
    width: Math.min(w, maxX + pad + 1) - left,
    height: Math.min(stripH, maxY + pad + 1) - top,
  };
}

// Binarization thresholds for the badge crop; 0 = invert + normalize
// (keeps antialiasing, helps when hard thresholds eat thin strokes).
const BADGE_THRESHOLDS = [165, 145, 150, 0];

function badgeCrop(bitmap: ImageBitmap, box: BadgeBox, threshold: number): HTMLCanvasElement {
  const scale = Math.min(12, Math.max(3, Math.round(140 / box.height)));
  const canvas = document.createElement("canvas");
  canvas.width = box.width * scale;
  canvas.height = box.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, box.left, box.top, box.width, box.height, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  if (threshold > 0) {
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = lum > threshold ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  } else {
    let min = 255;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = lum;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
    }
    const range = Math.max(max - min, 1);
    for (let i = 0; i < d.length; i += 4) {
      const v = 255 - ((d[i] - min) / range) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// [scale, threshold, rightHalfOnly] — later steps crop to the right half,
// where the badge sits, to cut surrounding noise when full-strip reads fail.
const BADGE_LADDER: [scale: number, threshold: number, rightHalf: boolean][] = [
  [4, 170, false],
  [3, 170, false],
  [4, 150, false],
  [3, 140, false],
  [4, 170, true],
  [4, 150, true],
  [5, 170, false],
  [4, 190, true],
];

function badgeStrip(
  bitmap: ImageBitmap,
  scale: number,
  threshold: number,
  rightHalf: boolean
): HTMLCanvasElement {
  const stripH = Math.min(Math.round(bitmap.width * 0.16), bitmap.height);
  const srcX = rightHalf ? Math.round(bitmap.width * 0.45) : 0;
  const srcW = bitmap.width - srcX;
  const canvas = document.createElement("canvas");
  canvas.width = srcW * scale;
  canvas.height = stripH * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, srcX, 0, srcW, stripH, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Bright pixels (white text) become black on a white page for Tesseract.
    const v = lum > threshold ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function pickVote(votes: string[]): string | null {
  if (votes.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = votes[0];
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

async function recognizeBadgeDate(worker: Worker, bitmap: ImageBitmap): Promise<string | null> {
  const box = findBadgeBox(bitmap);
  const votes: string[] = [];

  if (box) {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    for (const threshold of BADGE_THRESHOLDS) {
      const { data } = await worker.recognize(badgeCrop(bitmap, box, threshold));
      const date = extractDate(data.text);
      if (date) {
        votes.push(date);
        // Two agreeing reads are good enough — stop early.
        if (votes.length >= 2 && votes[votes.length - 1] === votes[votes.length - 2]) break;
      }
    }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    if (votes.length > 0) return pickVote(votes);
  }

  // Fallback: no green badge found (or unreadable) — full-strip ladder.
  for (const [scale, threshold, rightHalf] of BADGE_LADDER) {
    const { data } = await worker.recognize(badgeStrip(bitmap, scale, threshold, rightHalf));
    const date = extractDate(data.text);
    if (date) {
      votes.push(date);
      if (votes.length >= 2 && votes[votes.length - 1] === votes[votes.length - 2]) break;
    }
  }
  return pickVote(votes);
}

export interface OcrResult {
  text: string;
  /** Date read from the header badge; more reliable than dates in `text`. */
  date: string | null;
}

/**
 * OCR a batch of images with one shared worker (model download is the
 * slow part; reuse it across files).
 */
export async function ocrImageFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<OcrResult[]> {
  const worker = await createWorker("eng");
  const results: OcrResult[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const bitmap = await createImageBitmap(files[i]);
      const canvas = preprocess(bitmap);
      const { data } = await worker.recognize(canvas);
      const date = await recognizeBadgeDate(worker, bitmap);
      bitmap.close();
      results.push({ text: data.text, date });
      onProgress?.(i + 1, files.length);
    }
  } finally {
    await worker.terminate();
  }
  return results;
}
