"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  CheckCircle2,
  Table,
  Type,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SamplePreviewModal } from "@/components/preview/SamplePreviewModal";

export default function FieldMappingPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [mapping, setMapping] = React.useState<Record<string, any>>({});
  const [generatingPreview, setGeneratingPreview] = React.useState(false);
  const [previews, setPreviews] = React.useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/events/${params.eventId}/mapping`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load mapping data");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setMapping(resData.suggestedMapping || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.eventId]);

  const handleSourceTypeChange = (phId: string, type: "column" | "static") => {
    setMapping((prev) => ({
      ...prev,
      [phId]: {
        ...prev[phId],
        sourceType: type,
        column: type === "column" ? prev[phId]?.column || data.availableColumns[0] : undefined,
        staticValue: type === "static" ? prev[phId]?.staticValue || "" : undefined,
      },
    }));
  };

  const handleColumnChange = (phId: string, col: string) => {
    setMapping((prev) => ({
      ...prev,
      [phId]: {
        ...prev[phId],
        sourceType: "column",
        column: col,
      },
    }));
  };

  const handleStaticValueChange = (phId: string, val: string) => {
    setMapping((prev) => ({
      ...prev,
      [phId]: {
        ...prev[phId],
        sourceType: "static",
        staticValue: val,
      },
    }));
  };

  const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${params.eventId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to generate preview");

      setPreviews(resData.previews || []);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleApprove = () => {
    setIsModalOpen(false);
    router.push(`/events/${params.eventId}/generate`);
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const sampleParticipant = data.sampleParticipants[0] || {};
  const placeholders = data.template.placeholders || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 3 of 5</span>
            <Badge variant="outline">Field Mapping & Approval</Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Map Data to Template & Preview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review which spreadsheet column fills each placeholder tag on the organizer&apos;s certificate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePreview}
            isLoading={generatingPreview}
            className="text-xs gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> Sample Preview (5 Attendees)
          </Button>

          <Button
            size="sm"
            onClick={handleApprove}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            Approve & Proceed to Bulk Generation →
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Mapping Configuration Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Template Placeholder Mapping</CardTitle>
            <Badge variant="info">
              {placeholders.length} Active {placeholders.length === 1 ? "Field" : "Fields"} on Template
            </Badge>
          </div>
          <CardDescription>
            Confirm how data should be populated. You can map to a spreadsheet column or specify a fixed static value.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-48">Placeholder Tag</th>
                  <th className="py-3 px-4 w-40">Source Type</th>
                  <th className="py-3 px-4 min-w-[220px]">Mapped Column / Static Value</th>
                  <th className="py-3 px-4 min-w-[200px]">Sample Evaluated Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {placeholders.map((ph: any) => {
                  const currentMapping = mapping[ph.id] || { sourceType: "column", column: "name" };
                  const isStatic = currentMapping.sourceType === "static";

                  let evaluatedSample = "";
                  if (isStatic) {
                    evaluatedSample = currentMapping.staticValue || "";
                  } else {
                    const colKey = currentMapping.column;
                    evaluatedSample = sampleParticipant[colKey] !== undefined ? String(sampleParticipant[colKey]) : "—";
                  }

                  return (
                    <tr key={ph.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Placeholder Tag */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                            &#123;&#123;{ph.fieldKey}&#125;&#125;
                          </span>
                          <span className="text-[11px] font-sans font-normal text-slate-400">
                            ({ph.label})
                          </span>
                        </div>
                      </td>

                      {/* Source Type Toggle */}
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => handleSourceTypeChange(ph.id, "column")}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              !isStatic
                                ? "bg-white text-indigo-700 font-semibold shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Column
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSourceTypeChange(ph.id, "static")}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              isStatic
                                ? "bg-white text-indigo-700 font-semibold shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Fixed Text
                          </button>
                        </div>
                      </td>

                      {/* Mapped Column / Static Text Input */}
                      <td className="py-3 px-4">
                        {!isStatic ? (
                          <select
                            value={currentMapping.column || data.availableColumns[0]}
                            onChange={(e) => handleColumnChange(ph.id, e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {data.availableColumns.map((col: string) => (
                              <option key={col} value={col}>
                                Column: {col}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={currentMapping.staticValue || ""}
                            onChange={(e) => handleStaticValueChange(ph.id, e.target.value)}
                            placeholder="Enter fixed text..."
                            className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        )}
                      </td>

                      {/* Sample Evaluated Value */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                          {evaluatedSample || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sample Preview Carousel Modal */}
      <SamplePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        previews={previews}
        onApprove={handleApprove}
      />
    </div>
  );
}
