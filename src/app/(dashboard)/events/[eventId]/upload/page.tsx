"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { ValidationReportTable } from "@/components/upload/ValidationReportTable";
import { ValidationReport, ValidatedParticipantRow } from "@/lib/parser/validator";

export default function ParticipantUploadPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [existingParticipants, setExistingParticipants] = React.useState<any[]>([]);
  const [report, setReport] = React.useState<ValidationReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isWindowDragging, setIsWindowDragging] = React.useState(false);

  // Global window drag & drop handler for seamless drag from other apps
  React.useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      } else {
        const textData = e.dataTransfer?.getData("text/plain");
        if (textData) {
          handleTextDataReceived(textData);
        }
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // Fetch already saved participants if any
  const fetchExisting = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${params.eventId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setExistingParticipants(data.participants || []);
      }
    } finally {
      setLoading(false);
    }
  }, [params.eventId]);

  React.useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setSuccessMessage(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${params.eventId}/participants`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse spreadsheet file");
      }

      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTextDataReceived = async (rawText: string) => {
    setError(null);
    setSuccessMessage(null);
    setUploading(true);

    try {
      const res = await fetch(`/api/events/${params.eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse pasted table data");
      }

      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemapColumns = async (nameCol: string, emailCol: string) => {
    if (!report || !report.rawRows) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/events/${params.eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawRows: report.rawRows,
          nameColumn: nameCol,
          emailColumn: emailCol,
          sheetNames: report.sheetNames,
          activeSheetName: report.activeSheetName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remap columns");

      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRowsUpdated = (updatedRows: ValidatedParticipantRow[]) => {
    if (!report) return;
    setReport({
      ...report,
      rows: updatedRows,
    });
  };

  const handleConfirmAndSave = async () => {
    if (!report) return;
    setSaving(true);
    setError(null);

    try {
      const validParticipants = report.rows
        .filter((r) => !r.isExcluded && r.status === "valid")
        .map((r) => ({
          name: r.name,
          email: r.email,
          extraFields: r.extraFields,
        }));

      if (validParticipants.length === 0) {
        throw new Error("No valid, included participants to save.");
      }

      const res = await fetch(`/api/events/${params.eventId}/participants/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: validParticipants }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save participants");
      }

      setSuccessMessage(data.message || "Participants saved successfully!");
      setTimeout(() => {
        router.push(`/events/${params.eventId}/template`);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Full-Window Drag & Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white border-4 border-dashed border-white m-4 rounded-3xl pointer-events-none transition-all">
          <UploadCloud className="h-20 w-20 text-white animate-bounce mb-4" />
          <h3 className="text-2xl font-extrabold tracking-tight">Drop Spreadsheet Anywhere to Upload</h3>
          <p className="text-sm text-indigo-200 mt-2">
            Accepts Excel (.xlsx, .xls), CSV, TSV, or dragged table cells from any application.
          </p>
        </div>
      )}

      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 1 of 5</span>
            <Badge variant="outline">Data Ingestion & Validation</Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Upload Participant List</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Accepts any spreadsheet format (Excel, CSV, TSV, Google Sheets). Auto-detects columns with manual override.
          </p>
        </div>

        {existingParticipants.length > 0 && !report && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/events/${params.eventId}/template`)}
              className="gap-1.5"
            >
              Continue to Step 2 (Template) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* Existing participants card */}
      {existingParticipants.length > 0 && !report && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 className="h-5 w-5" />
                <CardTitle className="text-base text-indigo-950">
                  {existingParticipants.length} Participants Active
                </CardTitle>
              </div>
              <Badge variant="success">Confirmed & Ready</Badge>
            </div>
            <CardDescription>
              This event already has a validated participant list. You can proceed directly to designing your certificate template, or upload a new file below to replace it.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => router.push(`/events/${params.eventId}/template`)}
              className="gap-1.5 shadow-sm shadow-indigo-200"
            >
              Proceed to Certificate Template Studio <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      {!report ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {existingParticipants.length > 0 ? "Upload New Spreadsheet (Replace List)" : "Upload Spreadsheet"}
            </CardTitle>
            <CardDescription>
              Drag & drop from other apps (Explorer, Google Sheets, Excel) or browse from your computer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onFileSelected={handleFileSelected}
              onTextDataReceived={handleTextDataReceived}
              isLoading={uploading}
            />
          </CardContent>
        </Card>
      ) : (
        /* Validation & Column Mapping Console */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Spreadsheet Loaded Successfully</h3>
              <p className="text-xs text-slate-500">
                You can review or adjust column mappings below before confirming.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReport(null)}
              className="gap-1.5 text-xs text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Upload Different File
            </Button>
          </div>

          {/* Large dataset warning banner for 500+ rows */}
          {report.totalRows > 500 && (
            <Alert variant="warning" className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">
                  Large dataset detected ({report.totalRows} participants).
                </span>
                <p className="text-xs text-amber-800 mt-0.5">
                  Bulk certificate generation and email dispatch will be processed automatically in chunked batches (25-50 participants per batch) to maintain zero server memory spikes and safe SMTP rate limits.
                </p>
              </div>
            </Alert>
          )}

          <ValidationReportTable
            report={report}
            onRowsUpdated={handleRowsUpdated}
            onRemapColumns={handleRemapColumns}
            onConfirm={handleConfirmAndSave}
            isSaving={saving}
          />
        </div>
      )}
    </div>
  );
}
