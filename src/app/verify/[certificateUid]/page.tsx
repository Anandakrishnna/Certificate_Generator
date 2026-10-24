"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Download,
  Calendar,
  Building,
  User,
  Share2,
  Check,
  Printer,
  ExternalLink,
  Search,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VerificationData {
  verified: boolean;
  certificate?: {
    certificateUid: string;
    recipientName: string;
    recipientEmail: string;
    eventName: string;
    organizerName: string;
    eventDate: string;
    generatedAt: string;
    fileUrlPdf: string;
    fileUrlPng: string;
    extraFields: Record<string, any>;
  };
  error?: string;
}

export default function CertificateVerificationPage({
  params,
}: {
  params: { certificateUid: string };
}) {
  const [data, setData] = React.useState<VerificationData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [searchUid, setSearchUid] = React.useState("");

  React.useEffect(() => {
    async function verifyCertificate() {
      try {
        const res = await fetch(`/api/verify/${params.certificateUid}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setData({
          verified: false,
          error: "Failed to connect to verification server.",
        });
      } finally {
        setLoading(false);
      }
    }

    verifyCertificate();
  }, [params.certificateUid]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">
            Verifying certificate authenticity in public registry...
          </p>
        </div>
      </div>
    );
  }

  // Invalid / Not Found State
  if (!data || !data.verified || !data.certificate) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Award className="h-4 w-4" />
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                CertifyFlow
              </span>
            </Link>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verification Portal
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-md w-full mx-auto px-6 py-16 text-center">
          <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Certificate Not Found
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            We could not locate any authentic certificate record matching the UID:
            <span className="block mt-1 font-mono font-bold text-slate-800 bg-slate-200/80 px-2 py-1 rounded text-xs inline-block">
              {params.certificateUid}
            </span>
          </p>

          <div className="mt-8 p-5 bg-white border border-slate-200 rounded-xl text-left shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Verify Another Certificate UID:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. CERT-A1B2C3D4"
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (searchUid.trim()) {
                    window.location.href = `/verify/${searchUid.trim()}`;
                  }
                }}
                disabled={!searchUid.trim()}
                className="gap-1.5 text-xs"
              >
                <Search className="h-3.5 w-3.5" /> Check
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Please double check the certificate identifier or ask the issuing organization.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          CertifyFlow Credential Verification Engine &copy; {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  const { certificate } = data;
  const issueDateFormatted = certificate.eventDate
    ? new Date(certificate.eventDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const generatedDateFormatted = certificate.generatedAt
    ? new Date(certificate.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white print:bg-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Award className="h-4 w-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">
              CertifyFlow
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge
              variant="success"
              className="px-2.5 py-1 text-xs gap-1.5 font-semibold shadow-xs"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Official Verification Registry</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Verification Container */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Verification Status Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/30 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
                  Authentic Certificate Record
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Authentic Certificate issued by {certificate.organizerName}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
                  This credential has been verified against the official CertifyFlow digital issuance database.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Link Copied!" : "Share Link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* Verification Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-white shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              <span>Recipient Name</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1 truncate">
              {certificate.recipientName}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {certificate.recipientEmail}
            </div>
          </Card>

          <Card className="p-4 bg-white shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              <span>Event / Workshop</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1 truncate">
              {certificate.eventName}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Event Date: {issueDateFormatted}
            </div>
          </Card>

          <Card className="p-4 bg-white shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Building className="h-3.5 w-3.5 text-indigo-600" />
              <span>Issuing Body</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1 truncate">
              {certificate.organizerName}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Verified Issuer ✓
            </div>
          </Card>

          <Card className="p-4 bg-white shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>Certificate Identifier</span>
            </div>
            <div className="text-sm font-mono font-bold text-indigo-700 mt-1">
              {certificate.certificateUid}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Generated: {generatedDateFormatted}
            </div>
          </Card>
        </div>

        {/* Certificate Display & Download Center */}
        <Card className="bg-white shadow-sm overflow-hidden border-slate-200">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Official Credential Preview
              </h2>
              <p className="text-xs text-slate-500">
                Digitally generated certificate rendering with high-resolution vector text.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {certificate.fileUrlPdf && (
                <a
                  href={certificate.fileUrlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Full PDF
                  </Button>
                </a>
              )}

              {certificate.fileUrlPdf && (
                <a
                  href={certificate.fileUrlPdf}
                  download={`Certificate_${certificate.certificateUid}.pdf`}
                  className="inline-flex"
                >
                  <Button size="sm" className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Certificate Visual Embed */}
          <div className="p-4 sm:p-8 bg-slate-100 flex items-center justify-center">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden relative group">
              {certificate.fileUrlPng ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={certificate.fileUrlPng}
                  alt={`Certificate for ${certificate.recipientName}`}
                  className="w-full h-auto block select-none"
                />
              ) : certificate.fileUrlPdf ? (
                <iframe
                  src={`${certificate.fileUrlPdf}#toolbar=0`}
                  title="Certificate PDF Viewer"
                  className="w-full h-[550px] border-none"
                />
              ) : (
                <div className="py-24 text-center text-slate-400 text-xs">
                  Certificate preview unavailable
                </div>
              )}

              {/* Watermark/Verification corner ribbon */}
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>{certificate.certificateUid}</span>
              </div>
            </div>
          </div>

          {/* Download & Verification Footer inside Card */}
          <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Standard A4 Landscape &bull; Tamper-Evident UID Verification
              </span>
            </div>

            <div className="flex items-center gap-3">
              {certificate.fileUrlPng && (
                <a
                  href={certificate.fileUrlPng}
                  download={`Certificate_${certificate.certificateUid}.svg`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 text-xs"
                >
                  <Download className="h-3 w-3" /> Download High-Res Vector Image
                </a>
              )}
            </div>
          </div>
        </Card>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CertifyFlow Credential Verification Registry &copy; {new Date().getFullYear()}</span>
          <span className="text-slate-400">
            Issued under cryptographic identification {certificate.certificateUid}
          </span>
        </div>
      </footer>
    </div>
  );
}
