"use client";

import * as React from "react";
import { Upload, Image as ImageIcon, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateUploaderProps {
  currentBackgroundUrl: string;
  onUploadCustom: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export function TemplateUploader({
  currentBackgroundUrl,
  onUploadCustom,
  isUploading,
}: TemplateUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadCustom(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadCustom(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {currentBackgroundUrl ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentBackgroundUrl}
                alt="Uploaded Template"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Organizer Certificate Template Active
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Recipient names will be stamped onto this template with your chosen font style.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            className="text-xs gap-1.5 flex-shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Replace Template Image
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-600 bg-indigo-50/60"
              : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
          }`}
        >
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-3">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Upload Your Event Certificate Template
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Upload the certificate background created by your organizers (PNG, JPG, or SVG). Only the recipient name will be added on top.
          </p>
          <div className="mt-4">
            <Button size="sm" type="button" isLoading={isUploading} className="text-xs">
              Choose Certificate Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
