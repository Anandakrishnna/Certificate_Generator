"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, X, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SamplePreviewItem {
  participantId: string;
  name: string;
  email: string;
  backgroundUrl: string;
  fields: Array<{
    id: string;
    fieldKey: string;
    value: string;
    x: number;
    y: number;
    fontFamily: string;
    fontSize: number;
    color: string;
    textAnchor: "start" | "middle" | "end" | "inherit";
    isBold?: boolean;
    isItalic?: boolean;
  }>;
}

interface SamplePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previews: SamplePreviewItem[];
  onApprove: () => void;
}

export function SamplePreviewModal({
  isOpen,
  onClose,
  previews,
  onApprove,
}: SamplePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  if (!isOpen || previews.length === 0) return null;

  const current = previews[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : previews.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < previews.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {currentIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Sample Certificate Preview</h3>
                <Badge variant="info">
                  {currentIndex + 1} of {previews.length} Participants
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Recipient: <strong>{current.name}</strong> ({current.email})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate Display Area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-slate-100">
          <div className="w-full max-w-3xl shadow-xl rounded-xl overflow-hidden border border-slate-300 bg-white relative">
            <svg
              viewBox="0 0 1123 794"
              className="w-full h-auto block select-none"
              style={{ backgroundColor: "#ffffff" }}
            >
              {/* Background Image */}
              {current.backgroundUrl && (
                <image
                  href={current.backgroundUrl}
                  width="1123"
                  height="794"
                  preserveAspectRatio="xMidYMid slice"
                />
              )}

              {/* Rendered Placeholders */}
              {current.fields.map((f) => (
                <text
                  key={f.id}
                  x={f.x}
                  y={f.y}
                  textAnchor={f.textAnchor}
                  fill={f.color}
                  fontSize={f.fontSize}
                  fontFamily={f.fontFamily}
                  fontWeight={f.isBold ? "bold" : "normal"}
                  fontStyle={f.isItalic ? "italic" : "normal"}
                >
                  {f.value}
                </text>
              ))}
            </svg>
          </div>

          {/* Carousel Step Controls */}
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="gap-1.5 text-xs bg-white"
            >
              <ChevronLeft className="h-4 w-4" /> Previous Sample
            </Button>

            <div className="flex items-center gap-1.5">
              {previews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-7 bg-indigo-600"
                      : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`View sample ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-1.5 text-xs bg-white"
            >
              Next Sample <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Check typography alignment, name length fit, and contrast against your certificate.
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Back to Edit
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              className="gap-1.5 shadow-sm shadow-indigo-200 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve & Proceed to Generation →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
