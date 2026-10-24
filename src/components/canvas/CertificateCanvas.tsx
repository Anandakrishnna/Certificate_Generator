"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { PlaceholderConfig, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "@/types/template";

// Dynamically import Konva component with SSR disabled
const CertificateCanvasInner = dynamic(
  () => import("./CertificateCanvasInner"),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200"
        style={{ height: "500px" }}
      >
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
          <span>Loading Certificate Studio Canvas...</span>
        </div>
      </div>
    ),
  }
);

interface CertificateCanvasProps {
  backgroundUrl: string;
  placeholders: PlaceholderConfig[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (updated: PlaceholderConfig[]) => void;
  previewData: Record<string, string> | null;
}

export function CertificateCanvas({
  backgroundUrl,
  placeholders,
  selectedId,
  onSelect,
  onChange,
  previewData,
}: CertificateCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number>(0.75);

  // Auto-fit scale on mount and resize
  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 32; // padding
        const calculatedScale = Math.min(1, Math.max(0.4, availableWidth / DEFAULT_CANVAS_WIDTH));
        setScale(calculatedScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <span>Standard A4 Certificate Canvas ({DEFAULT_CANVAS_WIDTH} x {DEFAULT_CANVAS_HEIGHT} px)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.05))}
            className="p-1 rounded hover:bg-slate-200 text-slate-600"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(1.1, s + 0.05))}
            className="p-1 rounded hover:bg-slate-200 text-slate-600"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="w-full flex justify-center overflow-x-auto p-4 bg-slate-100/70 rounded-2xl border border-slate-200 shadow-inner">
        <CertificateCanvasInner
          canvasWidth={DEFAULT_CANVAS_WIDTH}
          canvasHeight={DEFAULT_CANVAS_HEIGHT}
          scale={scale}
          backgroundUrl={backgroundUrl}
          placeholders={placeholders}
          selectedId={selectedId}
          onSelect={onSelect}
          onChange={onChange}
          previewData={previewData}
        />
      </div>
    </div>
  );
}
