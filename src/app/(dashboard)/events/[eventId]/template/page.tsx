"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Palette,
  Eye,
  Save,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CertificateCanvas } from "@/components/canvas/CertificateCanvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { TemplateUploader } from "@/components/canvas/TemplateUploader";
import {
  PlaceholderConfig,
  TemplateData,
  DEFAULT_PLACEHOLDERS,
} from "@/types/template";

export default function CertificateStudioPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [template, setTemplate] = React.useState<TemplateData | null>(null);
  const [eventDetails, setEventDetails] = React.useState<any>(null);
  const [sampleParticipant, setSampleParticipant] = React.useState<any>(null);
  const [availableExtraColumns, setAvailableExtraColumns] = React.useState<string[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>("ph-name");
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingBg, setUploadingBg] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Fetch initial template configuration
  React.useEffect(() => {
    fetch(`/api/events/${params.eventId}/template`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load template");
        return res.json();
      })
      .then((data) => {
        setTemplate(data.template);
        setEventDetails(data.eventDetails);
        setSampleParticipant(data.sampleParticipant);
        setAvailableExtraColumns(data.extraColumns || []);
        // Select first placeholder by default
        if (data.template.placeholders.length > 0) {
          setSelectedId(data.template.placeholders[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.eventId]);

  const handleUpdateSelected = (updatedProps: Partial<PlaceholderConfig>) => {
    if (!template || !selectedId) return;
    const updated = template.placeholders.map((ph) =>
      ph.id === selectedId ? { ...ph, ...updatedProps } : ph
    );
    setTemplate({ ...template, placeholders: updated });
  };

  const handleDeleteSelected = () => {
    if (!template || !selectedId) return;
    const updated = template.placeholders.filter((ph) => ph.id !== selectedId);
    setTemplate({ ...template, placeholders: updated });
    setSelectedId(updated.length > 0 ? updated[0].id : null);
  };

  const handleAddPlaceholder = (fieldKey: string, label: string) => {
    if (!template) return;
    const newId = `ph-${fieldKey}-${Date.now()}`;
    const newPlaceholder: PlaceholderConfig = {
      id: newId,
      fieldKey,
      label,
      x: 200,
      y: 460,
      width: 500,
      height: 40,
      fontFamily: "Roboto",
      fontSize: 20,
      color: "#0f172a",
      align: "center",
      isBold: false,
      isItalic: false,
    };

    setTemplate({
      ...template,
      placeholders: [...template.placeholders, newPlaceholder],
    });
    setSelectedId(newId);
  };

  const handleUploadCustomBackground = async (file: File) => {
    setUploadingBg(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${params.eventId}/template/upload-background`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (template) {
        setTemplate({ ...template, backgroundUrl: data.backgroundUrl });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = async (proceedToNext = false) => {
    if (!template) return;
    if (!template.backgroundUrl) {
      setError("Please upload your event certificate template image before continuing.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/events/${params.eventId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundUrl: template.backgroundUrl,
          placeholders: template.placeholders,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      setSuccessMessage("Certificate template saved successfully!");

      if (proceedToNext) {
        setTimeout(() => {
          router.push(`/events/${params.eventId}/mapping`);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToNameOnly = () => {
    if (!template) return;
    if (confirm("Reset layout to only place the Participant Name?")) {
      setTemplate({
        ...template,
        placeholders: DEFAULT_PLACEHOLDERS,
      });
      setSelectedId("ph-name");
    }
  };

  if (loading || !template) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Preview data payload for live preview
  const previewPayload: Record<string, string> = {
    name: sampleParticipant?.name || "Sophia Martinez",
    event_name: eventDetails?.name || "Event Title",
    date: eventDetails?.eventDate
      ? new Date(eventDetails.eventDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "November 20, 2026",
    organizer: eventDetails?.organizerName || "Organization",
    ...(sampleParticipant || {}),
  };

  const selectedPlaceholder =
    template.placeholders.find((ph) => ph.id === selectedId) || null;

  const existingFieldKeys = template.placeholders.map((ph) => ph.fieldKey);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 2 of 5</span>
            <Badge variant="outline">Certificate Overlay Studio</Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Configure Certificate Template</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload the template provided by your event organizers and style the participant name to match the design.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Preview Toggle */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                !isPreviewMode
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              &#123;&#123;Placeholders&#125;&#125;
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isPreviewMode
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Sample Preview
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToNameOnly}
            className="text-xs gap-1"
            title="Reset to only place the recipient name"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Name Only
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            isLoading={saving}
            className="text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            isLoading={saving}
            disabled={!template.backgroundUrl}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            Save & Continue to Step 3 →
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* 1. Organizer Certificate Template Uploader */}
      <TemplateUploader
        currentBackgroundUrl={template.backgroundUrl}
        onUploadCustom={handleUploadCustomBackground}
        isUploading={uploadingBg}
      />

      {/* 2. Typography & Field Inspector */}
      <Toolbar
        selectedPlaceholder={selectedPlaceholder}
        onUpdateSelected={handleUpdateSelected}
        onDeleteSelected={handleDeleteSelected}
        onAddPlaceholder={handleAddPlaceholder}
        availableExtraColumns={availableExtraColumns}
        existingFieldKeys={existingFieldKeys}
      />

      {/* 3. Certificate Canvas Stage */}
      <CertificateCanvas
        backgroundUrl={template.backgroundUrl}
        placeholders={template.placeholders}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChange={(updated) => setTemplate({ ...template, placeholders: updated })}
        previewData={isPreviewMode ? previewPayload : null}
      />
    </div>
  );
}
