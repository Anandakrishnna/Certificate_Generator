"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Search,
  FileText,
  Clock,
  Layers,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";

export default function BulkGeneratePage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [statusData, setStatusData] = React.useState<{
    totalParticipants: number;
    generatedCount: number;
    certificates: any[];
  }>({ totalParticipants: 0, generatedCount: 0, certificates: [] });

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPreviewCert, setSelectedPreviewCert] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${params.eventId}/generate`);
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } finally {
      setLoading(false);
    }
  }, [params.eventId]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartGeneration = async () => {
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/events/${params.eventId}/generate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setSuccessMessage(data.message || `Successfully generated ${data.generatedCount} certificates!`);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAllGenerated =
    statusData.totalParticipants > 0 &&
    statusData.generatedCount >= statusData.totalParticipants;

  const filteredCertificates = statusData.certificates.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.certificateUid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 4 of 5</span>
            <Badge variant="outline">Batch Rendering Engine</Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bulk Certificate Generation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Render high-resolution PDF and vector files for all validated participants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAllGenerated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartGeneration}
              isLoading={generating}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Regenerate All
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => router.push(`/events/${params.eventId}/delivery`)}
            disabled={statusData.generatedCount === 0}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            Continue to Step 5: Deliver & Track →
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* Main Generation Status Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold">
                {isAllGenerated
                  ? "All Certificates Generated & Stored"
                  : statusData.generatedCount > 0
                  ? "Partial Generation Available"
                  : "Ready for Batch Generation"}
              </h3>
            </div>
            <p className="text-xs text-indigo-200 max-w-xl leading-relaxed">
              {statusData.totalParticipants} attendees ready. Server-side rendering generates PDF documents with embedded Unicode typography and unique verification IDs.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="text-2xl font-extrabold text-white">
                {statusData.generatedCount} / {statusData.totalParticipants}
              </span>
              <Badge
                variant={isAllGenerated ? "success" : "warning"}
                className="bg-white/20 text-white border-none"
              >
                {isAllGenerated ? "100% Completed" : "Pending Generation"}
              </Badge>
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              size="lg"
              onClick={handleStartGeneration}
              isLoading={generating}
              disabled={statusData.totalParticipants === 0}
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm shadow-lg gap-2"
            >
              {generating
                ? "Rendering Certificates..."
                : isAllGenerated
                ? "Regenerate All Certificates"
                : "Generate All Certificates Now →"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Certificates Gallery */}
      {statusData.certificates.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Generated Certificates Gallery ({statusData.certificates.length})
              </h3>
              <p className="text-xs text-slate-500">
                Inspect, spot-check previews, or download individual attendee files.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredCertificates.map((cert) => (
              <Card
                key={cert.id}
                className="hover:border-indigo-300 transition-all flex flex-col justify-between shadow-xs overflow-hidden"
              >
                <div>
                  {/* Thumbnail / Vector Embed */}
                  <div className="h-36 bg-slate-100 border-b border-slate-100 relative overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cert.fileUrlPng}
                      alt={cert.participantName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedPreviewCert(cert)}
                        className="text-xs h-7 px-2.5 gap-1 bg-white text-slate-900 shadow-sm"
                      >
                        <Eye className="h-3 w-3" /> Quick Inspect
                      </Button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {cert.participantName}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">{cert.participantEmail}</p>
                    <div className="pt-2">
                      <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-semibold">
                        {cert.certificateUid}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedPreviewCert(cert)}
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>

                  <a
                    href={cert.fileUrlPdf}
                    download={`${cert.participantName}_certificate.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 gap-1">
                      <Download className="h-3 w-3 text-slate-500" /> PDF
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Spot Check Preview Modal */}
      {selectedPreviewCert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPreviewCert(null)}
          title={`Certificate: ${selectedPreviewCert.participantName}`}
          description={`Verification ID: ${selectedPreviewCert.certificateUid}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPreviewCert.fileUrlPng}
                alt={selectedPreviewCert.participantName}
                className="w-full h-auto block"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Ready for automated delivery in Step 5.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPreviewCert.fileUrlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Full PDF in New Tab
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
