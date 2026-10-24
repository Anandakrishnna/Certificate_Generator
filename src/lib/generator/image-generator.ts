import { PlaceholderConfig, CERTIFICATE_FONTS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "@/types/template";

export interface GenerateImageOptions {
  backgroundUrl: string;
  placeholders: PlaceholderConfig[];
  participantData: Record<string, string>;
  certificateUid: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function generateCertificateSvg(options: GenerateImageOptions): string {
  const {
    backgroundUrl,
    placeholders,
    participantData,
    certificateUid,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
  } = options;

  const renderedFields = placeholders
    .map((ph) => {
      const cleanKey = ph.fieldKey.replace(/[{}]/g, "").trim();
      let val = "";
      if (participantData[ph.fieldKey] !== undefined) {
        val = String(participantData[ph.fieldKey]);
      } else if (participantData[cleanKey] !== undefined) {
        val = String(participantData[cleanKey]);
      } else {
        val = ph.fieldKey.startsWith("{{") ? ph.fieldKey : `{{${ph.fieldKey}}}`;
      }

      if (!val) return "";

      const matchedFont = CERTIFICATE_FONTS.find((f) => f.id === ph.fontFamily);
      const fontFamily = matchedFont ? matchedFont.family : ph.fontFamily || "sans-serif";

      let textAnchor = "middle";
      let xPos = ph.x + ph.width / 2;
      if (ph.align === "left") {
        textAnchor = "start";
        xPos = ph.x;
      } else if (ph.align === "right") {
        textAnchor = "end";
        xPos = ph.x + ph.width;
      }

      // Auto-shrink font size if text exceeds bounding box width
      let fontSize = ph.fontSize || 36;
      const estimatedWidth = val.length * fontSize * 0.58;
      if (ph.width > 0 && estimatedWidth > ph.width) {
        fontSize = Math.max(12, Math.floor(fontSize * (ph.width / estimatedWidth)));
      }

      const yPos = ph.y + fontSize * 0.9;
      const fontWeight = ph.isBold ? "bold" : "normal";
      const fontStyle = ph.isItalic ? "italic" : "normal";

      return `<text x="${xPos}" y="${yPos}" text-anchor="${textAnchor}" fill="${ph.color}" font-size="${fontSize}px" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}">${val}</text>`;
    })
    .join("\n  ");

  return `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;family=Cinzel:wght@600;700&amp;family=Dancing+Script:wght@600;700&amp;family=Great+Vibes&amp;family=Montserrat:wght@500;600&amp;family=Playfair+Display:ital,wght@0,600;1,600&amp;family=Roboto:wght@400;500;700&amp;display=swap');
    </style>
  </defs>
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="#FFFFFF"/>
  ${
    backgroundUrl
      ? `<image href="${backgroundUrl}" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="xMidYMid slice" />`
      : ""
  }
  ${renderedFields}
  <text x="40" y="${canvasHeight - 20}" font-family="Roboto, sans-serif" font-size="10px" fill="#64748b">Certificate ID: ${certificateUid}</text>
</svg>`;
}
