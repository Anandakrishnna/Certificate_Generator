export interface PlaceholderConfig {
  id: string;
  fieldKey: string; // "name" (primary), or optional "event_name", "date", "organizer", or custom column
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  isBold?: boolean;
  isItalic?: boolean;
  letterSpacing?: number;
}

export interface TemplateData {
  id?: string;
  eventId: string;
  backgroundUrl: string;
  placeholders: PlaceholderConfig[];
  canvasWidth: number;
  canvasHeight: number;
}

export const DEFAULT_CANVAS_WIDTH = 1123; // A4 Landscape
export const DEFAULT_CANVAS_HEIGHT = 794;

export const CERTIFICATE_FONTS = [
  { id: "Great Vibes", name: "Great Vibes (Calligraphy / Script)", family: "'Great Vibes', cursive" },
  { id: "Dancing Script", name: "Dancing Script (Handwritten Script)", family: "'Dancing Script', cursive" },
  { id: "Alex Brush", name: "Alex Brush (Flowing Script)", family: "'Alex Brush', cursive" },
  { id: "Playfair Display", name: "Playfair Display (Elegant Serif)", family: "'Playfair Display', Georgia, serif" },
  { id: "Cinzel", name: "Cinzel (Classical Roman)", family: "'Cinzel', serif" },
  { id: "Montserrat", name: "Montserrat (Modern Clean Sans)", family: "'Montserrat', sans-serif" },
  { id: "Roboto", name: "Roboto (Clean Standard)", family: "'Roboto', sans-serif" },
  { id: "Georgia", name: "Georgia (Classic Serif)", family: "Georgia, serif" },
];

// By default: ONLY the participant name is placed on the certificate!
export const DEFAULT_PLACEHOLDERS: PlaceholderConfig[] = [
  {
    id: "ph-name",
    fieldKey: "name",
    label: "Participant Name",
    x: 161,
    y: 380,
    width: 800,
    height: 75,
    fontFamily: "Great Vibes",
    fontSize: 52,
    color: "#0f172a",
    align: "center",
    isBold: false,
    isItalic: false,
    letterSpacing: 1,
  },
];
