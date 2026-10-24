"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Plus,
  Type,
  Move,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderConfig, CERTIFICATE_FONTS } from "@/types/template";

interface ToolbarProps {
  selectedPlaceholder: PlaceholderConfig | null;
  onUpdateSelected: (updated: Partial<PlaceholderConfig>) => void;
  onDeleteSelected: () => void;
  onAddPlaceholder: (fieldKey: string, label: string) => void;
  availableExtraColumns: string[];
  existingFieldKeys: string[];
}

const PRESET_COLORS = [
  "#0f172a", // Slate 900 (Formal Dark)
  "#1e293b", // Slate 800
  "#4338ca", // Royal Indigo
  "#1e3a8a", // Navy Blue
  "#854d0e", // Antique Gold / Bronze
  "#b45309", // Warm Gold
  "#047857", // Emerald Green
  "#991b1b", // Crimson Red
  "#000000", // Pure Black
  "#ffffff", // Pure White
];

export function Toolbar({
  selectedPlaceholder,
  onUpdateSelected,
  onDeleteSelected,
  onAddPlaceholder,
  availableExtraColumns,
  existingFieldKeys,
}: ToolbarProps) {
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* Header bar: Active Elements and Add Field Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Active Certificate Text Fields ({existingFieldKeys.length}):</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {existingFieldKeys.map((key) => {
              const isSelected = selectedPlaceholder?.fieldKey === key;
              return (
                <span
                  key={key}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  &#123;&#123;{key}&#125;&#125;
                  {/* Quick Delete icon directly on chip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlaceholder?.fieldKey === key) {
                        onDeleteSelected();
                      } else {
                        // select and then prompt delete
                        onDeleteSelected();
                      }
                    }}
                    className="hover:text-rose-400 text-slate-400 p-0.5"
                    title={`Remove {{${key}}}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Add Optional Field Menu */}
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="text-xs h-8 px-3 gap-1.5 border-slate-300"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-600" /> Add Optional Field
          </Button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Standard Event Fields
              </div>
              {!existingFieldKeys.includes("event_name") && (
                <button
                  type="button"
                  onClick={() => {
                    onAddPlaceholder("event_name", "Event Name");
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700"
                >
                  <span>&#123;&#123;event_name&#125;&#125;</span>
                  <Plus className="h-3 w-3 text-slate-400" />
                </button>
              )}
              {!existingFieldKeys.includes("date") && (
                <button
                  type="button"
                  onClick={() => {
                    onAddPlaceholder("date", "Event Date");
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700"
                >
                  <span>&#123;&#123;date&#125;&#125;</span>
                  <Plus className="h-3 w-3 text-slate-400" />
                </button>
              )}
              {!existingFieldKeys.includes("organizer") && (
                <button
                  type="button"
                  onClick={() => {
                    onAddPlaceholder("organizer", "Organizer");
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700"
                >
                  <span>&#123;&#123;organizer&#125;&#125;</span>
                  <Plus className="h-3 w-3 text-slate-400" />
                </button>
              )}

              {/* Extra Spreadsheet Columns */}
              {availableExtraColumns.length > 0 && (
                <>
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-t border-slate-100 mt-1">
                    Spreadsheet Columns
                  </div>
                  {availableExtraColumns.map((col) => {
                    const key = col.toLowerCase().replace(/\s+/g, "_");
                    if (existingFieldKeys.includes(key)) return null;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          onAddPlaceholder(key, col);
                          setShowAddMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50 text-indigo-700 flex items-center justify-between"
                      >
                        <span>&#123;&#123;{key}&#125;&#125;</span>
                        <Plus className="h-3 w-3 text-indigo-500" />
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Element Typography Inspector */}
      {selectedPlaceholder ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Type className="h-4 w-4 text-indigo-600" />
              <span>
                Styling <strong>&#123;&#123;{selectedPlaceholder.fieldKey}&#125;&#125;</strong> ({selectedPlaceholder.label})
              </span>
            </span>

            {/* Remove / Delete Option for this field */}
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteSelected}
              className="h-7 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs gap-1 font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove this Field
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Font Family (Matching Certificate Aesthetics) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Certificate Font</label>
              <select
                value={selectedPlaceholder.fontFamily}
                onChange={(e) => onUpdateSelected({ fontFamily: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                {CERTIFICATE_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Font Size</label>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedPlaceholder.fontSize}px
                </span>
              </div>
              <input
                type="range"
                min={16}
                max={96}
                value={selectedPlaceholder.fontSize}
                onChange={(e) =>
                  onUpdateSelected({ fontSize: parseInt(e.target.value, 10) })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Alignment & Styles */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Style & Alignment</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSelected({ isBold: !selectedPlaceholder.isBold })
                  }
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    selectedPlaceholder.isBold
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                  title="Toggle Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSelected({ isItalic: !selectedPlaceholder.isItalic })
                  }
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    selectedPlaceholder.isItalic
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                  title="Toggle Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSelected({ align: "left" })}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    selectedPlaceholder.align === "left"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSelected({ align: "center" })}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    selectedPlaceholder.align === "center"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSelected({ align: "right" })}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    selectedPlaceholder.align === "right"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Color Palette & Custom Hex */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Text Color</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateSelected({ color: c })}
                    style={{ backgroundColor: c }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      selectedPlaceholder.color.toLowerCase() === c.toLowerCase()
                        ? "scale-125 border-indigo-600 ring-2 ring-indigo-200"
                        : "border-slate-300 hover:scale-110"
                    }`}
                  />
                ))}
                {/* Custom Color Picker */}
                <input
                  type="color"
                  value={selectedPlaceholder.color}
                  onChange={(e) => onUpdateSelected({ color: e.target.value })}
                  className="h-6 w-6 rounded border cursor-pointer p-0"
                  title="Choose Custom Color"
                />
              </div>
            </div>
          </div>

          {/* Numeric Position Coordinates */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Move className="h-3.5 w-3.5" /> Drag on canvas or fine-tune position:
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <label className="flex items-center gap-1">
                X:
                <input
                  type="number"
                  value={Math.round(selectedPlaceholder.x)}
                  onChange={(e) =>
                    onUpdateSelected({ x: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-14 px-1.5 py-0.5 border rounded border-slate-200 text-slate-900 bg-white"
                />
              </label>
              <label className="flex items-center gap-1">
                Y:
                <input
                  type="number"
                  value={Math.round(selectedPlaceholder.y)}
                  onChange={(e) =>
                    onUpdateSelected({ y: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-14 px-1.5 py-0.5 border rounded border-slate-200 text-slate-900 bg-white"
                />
              </label>
              <label className="flex items-center gap-1">
                Width:
                <input
                  type="number"
                  value={Math.round(selectedPlaceholder.width)}
                  onChange={(e) =>
                    onUpdateSelected({ width: parseInt(e.target.value, 10) || 100 })
                  }
                  className="w-16 px-1.5 py-0.5 border rounded border-slate-200 text-slate-900 bg-white"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
          Click the recipient name on the certificate canvas to change its font, size, or color to match your template.
        </div>
      )}
    </div>
  );
}
