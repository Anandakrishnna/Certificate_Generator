"use client";

import * as React from "react";
import { Stage, Layer, Text as KonvaText, Image as KonvaImage, Rect, Transformer } from "react-konva";
import { PlaceholderConfig, CERTIFICATE_FONTS } from "@/types/template";

interface CertificateCanvasInnerProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  backgroundUrl: string;
  placeholders: PlaceholderConfig[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (updatedPlaceholders: PlaceholderConfig[]) => void;
  previewData: Record<string, string> | null;
}

function CanvasBackground({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  if (!url || !image) {
    return (
      <>
        <Rect width={width} height={height} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} listening={false} />
        <KonvaText
          text="Please upload your certificate template above"
          x={width / 2 - 250}
          y={height / 2 - 15}
          width={500}
          fontSize={20}
          fontFamily="Roboto, sans-serif"
          fill="#94a3b8"
          align="center"
          listening={false}
        />
      </>
    );
  }

  return <KonvaImage image={image} width={width} height={height} listening={false} />;
}

export default function CertificateCanvasInner({
  canvasWidth,
  canvasHeight,
  scale,
  backgroundUrl,
  placeholders,
  selectedId,
  onSelect,
  onChange,
  previewData,
}: CertificateCanvasInnerProps) {
  const transformerRef = React.useRef<any>(null);
  const textRefs = React.useRef<{ [key: string]: any }>({});

  React.useEffect(() => {
    if (transformerRef.current) {
      if (selectedId && textRefs.current[selectedId]) {
        transformerRef.current.nodes([textRefs.current[selectedId]]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, placeholders]);

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage() || e.target.attrs.fill === "#f8fafc") {
      onSelect(null);
    }
  };

  return (
    <Stage
      width={canvasWidth * scale}
      height={canvasHeight * scale}
      scaleX={scale}
      scaleY={scale}
      onClick={handleStageClick}
      onTap={handleStageClick}
      className="border border-slate-300 rounded-lg shadow-md bg-white mx-auto overflow-hidden"
    >
      <Layer>
        {/* Uploaded Certificate Background */}
        <CanvasBackground url={backgroundUrl} width={canvasWidth} height={canvasHeight} />

        {/* Placeholders */}
        {placeholders.map((ph) => {
          const isSelected = ph.id === selectedId;

          let displayText = `{{${ph.fieldKey}}}`;
          if (previewData && previewData[ph.fieldKey] !== undefined) {
            displayText = previewData[ph.fieldKey];
          }

          // Determine font style
          let fontStyle = "normal";
          if (ph.isBold && ph.isItalic) fontStyle = "italic bold";
          else if (ph.isBold) fontStyle = "bold";
          else if (ph.isItalic) fontStyle = "italic";

          // Match font family
          const matchedFont = CERTIFICATE_FONTS.find((f) => f.id === ph.fontFamily);
          const fontFamily = matchedFont ? matchedFont.family : ph.fontFamily || "Roboto, sans-serif";

          return (
            <React.Fragment key={ph.id}>
              {/* Highlight bounding box when selected */}
              {isSelected && (
                <Rect
                  x={ph.x - 4}
                  y={ph.y - 4}
                  width={ph.width + 8}
                  height={ph.height + 8}
                  stroke="#4f46e5"
                  strokeWidth={1.5}
                  dash={[4, 4]}
                  listening={false}
                />
              )}

              <KonvaText
                ref={(node) => {
                  if (node) textRefs.current[ph.id] = node;
                }}
                id={ph.id}
                text={displayText}
                x={ph.x}
                y={ph.y}
                width={ph.width}
                height={ph.height}
                fontSize={ph.fontSize}
                fontFamily={fontFamily}
                fontStyle={fontStyle}
                fill={ph.color}
                align={ph.align}
                draggable
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelect(ph.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onSelect(ph.id);
                }}
                onDragEnd={(e) => {
                  const newX = Math.max(0, Math.min(canvasWidth - ph.width, e.target.x()));
                  const newY = Math.max(0, Math.min(canvasHeight - ph.height, e.target.y()));

                  e.target.x(newX);
                  e.target.y(newY);

                  const updated = placeholders.map((item) =>
                    item.id === ph.id ? { ...item, x: newX, y: newY } : item
                  );
                  onChange(updated);
                }}
                onTransformEnd={(e) => {
                  const node = textRefs.current[ph.id];
                  if (!node) return;

                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();

                  node.scaleX(1);
                  node.scaleY(1);

                  const newWidth = Math.max(80, node.width() * scaleX);
                  const newHeight = Math.max(25, node.height() * scaleY);

                  const updated = placeholders.map((item) =>
                    item.id === ph.id
                      ? {
                          ...item,
                          x: node.x(),
                          y: node.y(),
                          width: newWidth,
                          height: newHeight,
                        }
                      : item
                  );
                  onChange(updated);
                }}
              />
            </React.Fragment>
          );
        })}

        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 80 || newBox.height < 25) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={false}
          enabledAnchors={["middle-left", "middle-right"]}
          anchorSize={8}
          borderStroke="#4f46e5"
          anchorFill="#4f46e5"
        />
      </Layer>
    </Stage>
  );
}
