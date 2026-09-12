#!/usr/bin/env node
/**
 * Generates `public/og.png`, the social share card, from scratch.
 *
 * There is no image editor in this repo's toolchain and no binary asset to
 * hand-maintain, so the card is drawn by this script instead: a 1200×630 PNG
 * written byte-for-byte with `node:zlib`. It is committed (Vercel serves it
 * straight out of `public/`) and reproducible — `node scripts/make-og-image.mjs`
 * regenerates an identical file, so it can never drift from what the README
 * claims.
 *
 * The wordmark is rendered from a small bitmap font rather than a webfont, so
 * the output depends on nothing installed on the machine running it.
 *
 * Usage: node scripts/make-og-image.mjs [--check]
 *   --check  regenerate in memory and fail if the committed file differs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "og.png");

/* ---------------------------------------------------------------- palette */

const TOP = [16, 19, 21]; // #101315 — the app's page background
const BOTTOM = [20, 24, 26]; // #14181a — the app's card background
const AMBER = [232, 167, 62]; // #e8a73e — the accent
const INK = [154, 161, 166]; // #9aa1a6 — the muted text colour
const SHADOW = [8, 10, 11];

/* ------------------------------------------------------------ bitmap font */

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

/** Width of `text` in pixels at `scale`, including trailing letter spacing. */
function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

function drawText(buffer, text, { scale, cx, cy, colour, shadow = null }) {
  const startX = Math.round(cx - textWidth(text, scale) / 2);
  const startY = Math.round(cy - (7 * scale) / 2);

  const passes = shadow ? [[shadow.dx, shadow.dy, shadow.colour], [0, 0, colour]] : [[0, 0, colour]];

  for (const [dx, dy, paint] of passes) {
    text.split("").forEach((char, index) => {
      const glyph = GLYPHS[char] ?? GLYPHS[" "];
      const originX = startX + index * 6 * scale + dx;
      const originY = startY + dy;

      glyph.forEach((row, y) => {
        row.split("").forEach((on, x) => {
          if (on !== "1") return;
          fillRect(buffer, originX + x * scale, originY + y * scale, scale, scale, paint);
        });
      });
    });
  }
}

/* ------------------------------------------------------------------ canvas */

function fillRect(buffer, x, y, w, h, colour) {
  for (let row = y; row < y + h; row += 1) {
    if (row < 0 || row >= HEIGHT) continue;
    for (let col = x; col < x + w; col += 1) {
      if (col < 0 || col >= WIDTH) continue;
      const at = (row * WIDTH + col) * 3;
      buffer[at] = colour[0];
      buffer[at + 1] = colour[1];
      buffer[at + 2] = colour[2];
    }
  }
}

function paint() {
  const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const base = [
      TOP[0] + (BOTTOM[0] - TOP[0]) * t,
      TOP[1] + (BOTTOM[1] - TOP[1]) * t,
      TOP[2] + (BOTTOM[2] - TOP[2]) * t,
    ];

    for (let x = 0; x < WIDTH; x += 1) {
      // A faint warm bloom behind the wordmark, echoing the site's hero glow.
      const glow = Math.max(0, 1 - Math.hypot(x - cx, y - cy + 20) / (maxDist * 0.85));
      const at = (y * WIDTH + x) * 3;
      buffer[at] = Math.round(base[0] + (AMBER[0] - base[0]) * glow * 0.07);
      buffer[at + 1] = Math.round(base[1] + (AMBER[1] - base[1]) * glow * 0.07);
      buffer[at + 2] = Math.round(base[2] + (AMBER[2] - base[2]) * glow * 0.07);
    }
  }

  // Film-strip perforations top and bottom: the product's identity in one line.
  const hole = 26;
  const pitch = 60;
  const rows = [26, HEIGHT - 26 - hole];
  for (const y of rows) {
    for (let x = (WIDTH % pitch) / 2; x + hole <= WIDTH; x += pitch) {
      fillRect(buffer, Math.round(x), y, hole, hole, [36, 42, 46]); // #242a2e
      fillRect(buffer, Math.round(x) + 7, y + 7, hole - 14, hole - 14, [45, 52, 56]);
    }
  }

  // The aperture mark: a filled amber frame around the page-coloured centre.
  const mark = 92;
  const markX = Math.round(cx - mark / 2);
  const markY = 168;
  fillRect(buffer, markX, markY, mark, mark, AMBER);
  fillRect(buffer, markX + 22, markY + 22, mark - 44, mark - 44, BOTTOM);
  fillRect(buffer, markX + 40, markY + 40, mark - 80, mark - 80, AMBER);

  drawText(buffer, "FLICKS", {
    scale: 18,
    cx,
    cy: 350,
    colour: [243, 241, 236], // #f3f1ec
    shadow: { dx: 5, dy: 5, colour: SHADOW },
  });

  drawText(buffer, "DISCOVER. SAVE. ASK THE AI.", {
    scale: 6,
    cx,
    cy: 452,
    colour: INK,
  });

  // Accent rule under the tagline.
  fillRect(buffer, Math.round(cx - 44), 496, 88, 4, AMBER);

  return buffer;
}

/* --------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgb) {
  // Filter type 0 (None) on every scanline — the image is flat colour, so
  // compression does the work and the encoder stays ten lines long.
  const stride = WIDTH * 3;
  const raw = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------------- main */

const png = encodePng(paint());

if (process.argv.includes("--check")) {
  let existing = null;
  try {
    existing = readFileSync(OUT);
  } catch {
    existing = null;
  }
  if (!existing || !existing.equals(png)) {
    console.error("public/og.png is missing or out of date — run: node scripts/make-og-image.mjs");
    process.exit(1);
  }
  console.log(`og.png is up to date (${png.length} bytes).`);
} else {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, png);
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${png.length} bytes, ${WIDTH}×${HEIGHT})`);
}
