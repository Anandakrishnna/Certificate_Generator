"use client";

import * as React from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  ClipboardPaste,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onTextDataReceived: (rawText: string) => void;
  isLoading?: boolean;
}

export function FileDropzone({
  onFileSelected,
  onTextDataReceived,
  isLoading,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    const validExtensions = [
      ".csv",
      ".xlsx",
      ".xls",
      ".tsv",
      ".txt",
      ".tab",
      ".ods",
      ".xlsm",
      ".xlsb",
    ];

    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setError(
        "Supported formats: Excel (.xlsx, .xls, .ods), CSV (.csv), or TSV/Tab-delimited text files (.tsv, .txt)."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB maximum limit.");
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 1. Check if user dropped actual files from other applications (Explorer, Finder, Desktop, Mail)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      return;
    }

    // 2. Check if user dragged text/cells directly from Excel, Google Sheets, or web tables
    const textData =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text/csv") ||
      e.dataTransfer.getData("text/tab-separated-values");

    if (textData && textData.trim()) {
      onTextDataReceived(textData);
      return;
    }

    setError("No valid spreadsheet file or table data detected in the drop.");
  };

  // Support Ctrl+V paste from Excel / Google Sheets
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Check for file in clipboard
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processFile(e.clipboardData.files[0]);
        return;
      }

      // Check for tabular text from Excel / Google Sheets
      const text = e.clipboardData?.getData("text/plain");
      if (text && (text.includes("\t") || text.includes(","))) {
        onTextDataReceived(text);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "name,email,role,college\n" +
      "Alice Walker,alice.walker@example.com,Speaker,Stanford University\n" +
      "Bob Dylan,bob.dylan@example.com,Participant,MIT\n" +
      "Charlie Brown,charlie.brown@example.com,Organizer,UC Berkeley\n" +
      "Diana Prince,diana.prince@example.com,Winner,Harvard\n" +
      "Duplicate User,alice.walker@example.com,Participant,Duplicate Email Test\n" +
      ",missingname@example.com,Participant,Missing Name Test\n" +
      "Bad Email User,bad-email-format,Participant,Invalid Email Test\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_participants.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all relative overflow-hidden ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/70 scale-[1.01] shadow-lg ring-4 ring-indigo-100"
            : "border-slate-300 hover:border-indigo-400 bg-white shadow-xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, .tsv, .txt, .ods, .tab"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-base font-bold text-slate-900">
          Drag & Drop Spreadsheet from any App
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          Drop files directly from <strong>Windows Explorer, Desktop, or Downloads</strong>. You can also select and drag cells directly from <strong>Excel / Google Sheets</strong> or press <strong>Ctrl+V</strong> to paste!
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="sm"
            type="button"
            isLoading={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="shadow-sm shadow-indigo-200"
          >
            Browse from Computer
          </Button>

          <span className="text-xs text-slate-400">or press Ctrl+V to paste table cells</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 p-3 rounded-lg border border-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helpful Hint & Sample Download */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-slate-100/70 p-3.5 rounded-xl gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <span>
            Accepts <strong>any format</strong> (Excel, CSV, TSV, Google Sheets). We auto-detect column names or let you map them.
          </span>
        </div>
        <button
          type="button"
          onClick={downloadSampleCsv}
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 underline flex-shrink-0"
        >
          <Download className="h-3.5 w-3.5" /> Download Sample CSV
        </button>
      </div>
    </div>
  );
}
