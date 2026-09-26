/**
 * Generates qr-posters.pdf in the project root.
 * Run: node scripts/generate-qr-pdf.mjs
 */

import QRCode from "qrcode";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const CHECKPOINTS = [
  { id: "irc",   name: "IRC",          qrCode: "CQ-X7K2M4P9" },
  { id: "green", name: "Campus Green", qrCode: "CQ-Q3R8T5W1" },
  { id: "nord",  name: "Nord Canteen", qrCode: "CQ-B6N1Y4H7" },
  { id: "scc",   name: "SCC",          qrCode: "CQ-F2J9L6D3" },
  { id: "sac",   name: "SAC",          qrCode: "CQ-C5V8Z2G4" },
  { id: "tos",   name: "TOS",          qrCode: "CQ-M1A7E3S6" },
  { id: "rlh",   name: "RLH",          qrCode: "CQ-U9W4K8P2" },
];

const W = 1200;
const QR_SIZE = 700;
const BORDER = 24;
const innerGap = 6;
const totalFrame = QR_SIZE + BORDER * 2 + innerGap * 2 + BORDER;

async function buildPoster(cp) {
  const qrPng = await QRCode.toBuffer(cp.qrCode, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: QR_SIZE,
    color: { dark: "#0A0F2E", light: "#FFFFFF" },
  });

  const frameOuter = QR_SIZE + BORDER * 2;

  const goldFrame = await sharp({
    create: { width: totalFrame, height: totalFrame, channels: 4,
      background: { r: 212, g: 175, b: 55, alpha: 1 } },
  })
    .composite([
      {
        input: await sharp({ create: { width: frameOuter + innerGap * 2, height: frameOuter + innerGap * 2,
          channels: 4, background: { r: 10, g: 15, b: 46, alpha: 1 } } }).png().toBuffer(),
        top: Math.floor(BORDER / 2), left: Math.floor(BORDER / 2),
      },
      {
        input: await sharp({ create: { width: frameOuter, height: frameOuter,
          channels: 4, background: { r: 212, g: 175, b: 55, alpha: 1 } } }).png().toBuffer(),
        top: Math.floor(BORDER / 2) + innerGap, left: Math.floor(BORDER / 2) + innerGap,
      },
      {
        input: await sharp({ create: { width: QR_SIZE, height: QR_SIZE,
          channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer(),
        top: Math.floor(BORDER / 2) + innerGap + BORDER, left: Math.floor(BORDER / 2) + innerGap + BORDER,
      },
      { input: qrPng, top: Math.floor(BORDER / 2) + innerGap + BORDER, left: Math.floor(BORDER / 2) + innerGap + BORDER },
    ])
    .png()
    .toBuffer();

  const CORNER = 28;
  const cornerSvg = Buffer.from(
    `<svg width="${CORNER}" height="${CORNER}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${CORNER/2},0 ${CORNER},${CORNER/2} ${CORNER/2},${CORNER} 0,${CORNER/2}" fill="#D4AF37"/>
    </svg>`
  );

  const HEADER_H = 320;
  const headerSvg = Buffer.from(
    `<svg width="${W}" height="${HEADER_H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="80" y="40" width="${W - 160}" height="2" fill="#D4AF37" opacity="0.5"/>
      <rect x="80" y="48" width="${W - 160}" height="1" fill="#D4AF37" opacity="0.25"/>
      <text x="${W / 2}" y="130" font-family="Georgia, serif" font-size="82" font-weight="bold"
        fill="#D4AF37" text-anchor="middle" letter-spacing="14">UNI GAMES</text>
      <text x="${W / 2}" y="188" font-family="Georgia, serif" font-size="44"
        fill="#D4AF37" text-anchor="middle" letter-spacing="20" opacity="0.85">2 0 2 6</text>
      <rect x="80" y="216" width="${W / 2 - 40}" height="1" fill="#D4AF37" opacity="0.6"/>
      <polygon points="${W/2},208 ${W/2+8},216 ${W/2},224 ${W/2-8},216" fill="#D4AF37"/>
      <rect x="${W / 2 + 40}" y="216" width="${W / 2 - 120}" height="1" fill="#D4AF37" opacity="0.6"/>
      <text x="${W / 2}" y="275" font-family="Georgia, serif" font-size="48"
        fill="#FFFFFF" text-anchor="middle" letter-spacing="8">CONSTRUCTOR QUEST</text>
      <text x="${W / 2}" y="312" font-family="Arial, sans-serif" font-size="24"
        fill="#7A8FC4" text-anchor="middle" letter-spacing="2">constructorquest.netlify.app</text>
    </svg>`
  );

  const FOOTER_H = 100;
  const footerSvg = Buffer.from(
    `<svg width="${W}" height="${FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="80" y="36" width="${W - 160}" height="1" fill="#D4AF37" opacity="0.25"/>
      <rect x="80" y="42" width="${W - 160}" height="2" fill="#D4AF37" opacity="0.5"/>
      <text x="${W / 2}" y="80" font-family="Arial, sans-serif" font-size="20"
        fill="#4A5580" text-anchor="middle" letter-spacing="4">SCAN TO PARTICIPATE</text>
    </svg>`
  );

  const PAD_V = 40;
  const GAP = 36;
  const POSTER_H = PAD_V + HEADER_H + GAP + totalFrame + GAP + FOOTER_H + PAD_V;

  const bgSvg = Buffer.from(
    `<svg width="${W}" height="${POSTER_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%"   stop-color="#1A2560" stop-opacity="1"/>
          <stop offset="100%" stop-color="#0A0F2E" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${POSTER_H}" fill="url(#glow)"/>
    </svg>`
  );

  const canvas = await sharp(bgSvg).png().toBuffer();

  const qrLeft = Math.round((W - totalFrame) / 2);
  const qrTop  = PAD_V + HEADER_H + GAP;
  const footerTop = qrTop + totalFrame + GAP;

  return sharp(canvas)
    .composite([
      { input: headerSvg, top: PAD_V, left: 0 },
      { input: goldFrame, top: qrTop, left: qrLeft },
      { input: cornerSvg, top: qrTop - CORNER / 2, left: qrLeft - CORNER / 2 },
      { input: cornerSvg, top: qrTop - CORNER / 2, left: qrLeft + totalFrame - CORNER / 2 },
      { input: cornerSvg, top: qrTop + totalFrame - CORNER / 2, left: qrLeft - CORNER / 2 },
      { input: cornerSvg, top: qrTop + totalFrame - CORNER / 2, left: qrLeft + totalFrame - CORNER / 2 },
      { input: footerSvg, top: footerTop, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function main() {
  const outPath = path.join(ROOT, "qr-posters.pdf");
  const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  for (const cp of CHECKPOINTS) {
    process.stdout.write(`Generating ${cp.name}…`);
    const png = await buildPoster(cp);

    // A4 landscape in points (842 x 595) — or use portrait A4 (595 x 842)
    // We use A4 portrait since posters are taller than wide.
    doc.addPage({ size: "A4", margin: 0 });
    const { width: pageW, height: pageH } = doc.page;
    // fit inside the page (no cropping), centred
    doc.image(png, 0, 0, { fit: [pageW, pageH], align: "center", valign: "center" });
    console.log(" done");
  }

  doc.end();
  await new Promise((res, rej) => { stream.on("finish", res); stream.on("error", rej); });
  console.log(`\nSaved → ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
