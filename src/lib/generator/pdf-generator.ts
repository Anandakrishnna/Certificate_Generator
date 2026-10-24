import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PlaceholderConfig, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "@/types/template";

// Helper to convert hex color (#0f172a) to pdf-lib rgb(r, g, b)
export function hexToRgbColor(hex: string) {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return rgb(0.06, 0.09, 0.16); // Default slate 900

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}

export interface GeneratePdfOptions {
  backgroundUrl: string;
  placeholders: PlaceholderConfig[];
  participantData: Record<string, string>;
  certificateUid: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export async function generateCertificatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const {
    backgroundUrl,
    placeholders,
    participantData,
    certificateUid,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
  } = options;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // A4 Landscape dimensions in points (72 DPI standard PDF): 841.89 x 595.28
  // Or match canvas dimensions directly: canvasWidth x canvasHeight
  const page = pdfDoc.addPage([canvasWidth, canvasHeight]);

  // Load and embed background image
  if (backgroundUrl) {
    try {
      let imageBuffer: Buffer | null = null;
      let cleanUrl = backgroundUrl.startsWith("/") ? backgroundUrl.slice(1) : backgroundUrl;
      const localFilePath = path.join(process.cwd(), "public", cleanUrl);

      if (fs.existsSync(localFilePath)) {
        imageBuffer = await fs.promises.readFile(localFilePath);
      }

      if (imageBuffer) {
        const lowerUrl = cleanUrl.toLowerCase();
        let embeddedImage: any = null;

        if (lowerUrl.endsWith(".png")) {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
          embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        }

        if (embeddedImage) {
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
          });
        }
      }
    } catch (err) {
      console.warn("Could not embed background image in PDF:", err);
    }
  }

  // Load custom TTF fonts if present in public/fonts (Unicode-safe)
  let embeddedFont: any = null;
  let embeddedSerifFont: any = null;
  try {
    const regularFontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
    if (fs.existsSync(regularFontPath)) {
      const fontBytes = await fs.promises.readFile(regularFontPath);
      embeddedFont = await pdfDoc.embedFont(fontBytes, { subset: true });
    }
    const serifFontPath = path.join(process.cwd(), "public", "fonts", "NotoSerif-Regular.ttf");
    if (fs.existsSync(serifFontPath)) {
      const serifBytes = await fs.promises.readFile(serifFontPath);
      embeddedSerifFont = await pdfDoc.embedFont(serifBytes, { subset: true });
    }
  } catch (err) {
    console.warn("Could not load custom TTF fonts, falling back to StandardFonts:", err);
  }

  const standardHelvetica = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const standardSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Render placeholders
  for (const ph of placeholders) {
    const cleanKey = ph.fieldKey.replace(/[{}]/g, "").trim();
    let textToDraw = "";
    if (participantData[ph.fieldKey] !== undefined) {
      textToDraw = String(participantData[ph.fieldKey]);
    } else if (participantData[cleanKey] !== undefined) {
      textToDraw = String(participantData[cleanKey]);
    } else {
      textToDraw = ph.fieldKey.startsWith("{{") ? ph.fieldKey : `{{${ph.fieldKey}}}`;
    }

    if (!textToDraw) continue;

    // Pick font
    const isSerif =
      ph.fontFamily.toLowerCase().includes("serif") ||
      ph.fontFamily.toLowerCase().includes("georgia") ||
      ph.fontFamily.toLowerCase().includes("times") ||
      ph.fontFamily.toLowerCase().includes("cinzel");

    let fontToUse = isSerif
      ? embeddedSerifFont || standardSerif
      : embeddedFont || standardHelvetica;

    let fontSize = ph.fontSize || 36;
    const textColor = hexToRgbColor(ph.color || "#0f172a");

    let textWidth = 0;
    try {
      textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);
    } catch {
      // Fallback to standard font if custom font lacks specific glyph
      fontToUse = isSerif ? standardSerif : standardHelvetica;
      try {
        textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);
      } catch {
        textWidth = fontSize * textToDraw.length * 0.55;
      }
    }

    // Auto-shrink if text width exceeds placeholder bounding box width
    if (ph.width > 0 && textWidth > ph.width) {
      const scaleFactor = ph.width / textWidth;
      const minFontSize = 12;
      fontSize = Math.max(minFontSize, Math.floor(fontSize * scaleFactor));
      try {
        textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);
      } catch {
        textWidth = fontSize * textToDraw.length * 0.55;
      }
    }

    // Horizontal alignment
    let x = ph.x;
    if (ph.align === "center") {
      x = ph.x + (ph.width - textWidth) / 2;
    } else if (ph.align === "right") {
      x = ph.x + ph.width - textWidth;
    }

    // Convert Canvas top-left coordinates to PDF bottom-left coordinates
    const pdfY = canvasHeight - ph.y - fontSize * 0.95;

    page.drawText(textToDraw, {
      x: Math.max(0, x),
      y: Math.max(0, pdfY),
      size: fontSize,
      font: fontToUse,
      color: textColor,
    });
  }

  // Embed subtle verification UID on the bottom margin
  const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Certificate ID: ${certificateUid}`, {
    x: 40,
    y: 25,
    size: 9,
    font: footerFont,
    color: rgb(0.45, 0.5, 0.58),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
