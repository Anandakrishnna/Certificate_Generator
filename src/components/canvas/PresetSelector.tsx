"use client";

import * as React from "react";
import { Upload, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PresetSelectorProps {
  currentBackgroundUrl: string;
  onSelectBackground: (url: string) => void;
  onUploadCustom: (file: File) => Promise<void>;
  isUploading?: boolean;
}

const PRESETS = [
  {
    id: "classic_slate",
    name: "Classic Slate",
    subtitle: "Formal Serif & Border Seal",
    url: "/templates/presets/classic_slate.svg",
  },
  {
    id: "modern_indigo",
    name: "Modern Indigo",
    subtitle: "Clean Geometric Accents",
    url: "/templates/presets/modern_indigo.svg",
  },
];

export function PresetSelector({
  currentBackgroundUrl,
  onSelectBackground,
  onUploadCustom,
  isUploading,
}: PresetSelectorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadCustom(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4 text-indigo-600" />
          <span>Certificate Background Design</span>
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
          className="text-xs h-7 px-2.5 gap-1.5"
        >
          <Upload className="h-3 w-3" /> Upload Custom Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESETS.map((preset) => {
          const isSelected = currentBackgroundUrl === preset.url;
          return (
            <div
              key={preset.id}
              onClick={() => onSelectBackground(preset.url)}
              className={`border-2 rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900">{preset.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{preset.subtitle}</p>
              </div>

              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
