"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Mail,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCw,
  Check,
  TrendingUp,
  History,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmailSettingsModal } from "@/components/delivery/EmailSettingsModal";

export default function DeliveryTrackingPage({
  params,
}: {
  params: { eventId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [deliveryData, setDeliveryData] = React.useState<any>(null);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "sent" | "failed" | "pending">("all");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [emailSettings, setEmailSettings] = React.useState<{
    isConfigured: boolean;
    provider: string;
    smtpUser: string;
  } | null>(null);

  const fetchEmailSettings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/email/settings");
      if (res.ok) {
        const data = await res.json();
        setEmailSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch email settings:", err);
    }
  }, []);

  const fetchDeliveryData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${params.eventId}/delivery`);
      if (res.ok) {
        const data = await res.json();
        setDeliveryData(data);
        if (!subject && data.template) {
          setSubject(data.template.subject);
          setBody(data.template.body);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [params.eventId, subject]);

  React.useEffect(() => {
    fetchDeliveryData();
    fetchEmailSettings();
    // Poll status every 4 seconds if there are active queued or sending emails
    const interval = setInterval(() => {
      fetchDeliveryData();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDeliveryData, fetchEmailSettings]);

  const handleSendAll = async () => {
    setSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/events/${params.eventId}/delivery/send-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to dispatch emails");

      setSuccessMessage(resData.message || "All certificates dispatched to delivery queue!");
      await fetchDeliveryData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleResendSingle = async (deliveryId: string) => {
    setResendingId(deliveryId);
    try {
      const res = await fetch(`/api/events/${params.eventId}/delivery/resend-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId, subject, body }),
      });

      if (res.ok) {
        await fetchDeliveryData();
      }
    } finally {
      setResendingId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${params.eventId}/delivery/retry-failed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      if (res.ok) {
        await fetchDeliveryData();
      }
    } finally {
      setSending(false);
    }
  };

  const handleExportCsvReport = () => {
    if (!deliveryData || !deliveryData.recipients) return;
    const headers = ["Name", "Email", "Certificate_ID", "Delivery_Status", "Attempts", "Sent_At", "Error_Message"];
    const rows = deliveryData.recipients.map((r: any) => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.email.replace(/"/g, '""')}"`,
      `"${r.certificateUid || "None"}"`,
      `"${r.status}"`,
      r.attemptCount,
      `"${r.sentAt ? new Date(r.sentAt).toLocaleString() : ""}"`,
      `"${(r.errorMessage || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `delivery_report_${params.eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const { metrics, recipients } = deliveryData;

  const filteredRecipients = recipients.filter((r: any) => {
    if (filter === "sent") return r.status === "sent";
    if (filter === "failed") return r.status === "failed" || r.status === "retrying";
    if (filter === "pending") return r.status === "queued" || r.status === "sending" || r.status === "not_queued";
    return true;
  });

  const completionPercentage =
    metrics.total > 0 ? Math.round((metrics.sent / metrics.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 5 of 5</span>
            <Badge variant="outline">Email Delivery & Tracking</Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Email Delivery Console</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver personalized certificates with automated exponential retries and live per-recipient tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {emailSettings?.isConfigured ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-xs gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              SMTP Active: {emailSettings.smtpUser}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-xs gap-1.5 text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100/80 font-medium"
            >
              <Settings className="h-3.5 w-3.5 text-amber-600" />
              Configure Gmail / SMTP
            </Button>
          )}

          <a
            href={`/api/events/${params.eventId}/delivery/export`}
            download
            className="inline-flex"
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export Report (CSV)
            </Button>
          </a>

          {metrics.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryAllFailed}
              isLoading={sending}
              className="text-xs gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <RotateCw className="h-3.5 w-3.5" /> Retry All Failed ({metrics.failed})
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSendAll}
            isLoading={sending}
            disabled={metrics.certificatesReady === 0}
            className="gap-1.5 shadow-sm shadow-indigo-200"
          >
            <Send className="h-3.5 w-3.5" /> Send All Certificates →
          </Button>
        </div>
      </div>

      {/* Simulated Mode Banner if not configured */}
      {!emailSettings?.isConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700 font-bold">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                <span>Simulation (Mock) Mode Active</span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  Real emails not dispatched
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The platform is currently simulating email delivery locally. To send real certificates directly to participants' actual Gmail or corporate inboxes, connect your Gmail or SMTP credentials.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-xs gap-1.5 text-amber-900 border-amber-300 bg-white hover:bg-amber-50 flex-shrink-0 font-medium"
          >
            <Settings className="h-3.5 w-3.5 text-amber-700" />
            Setup Gmail SMTP Now
          </Button>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="p-4 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Recipients</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.sent}</div>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Success Rate
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {metrics.total > 0 ? Math.round((metrics.sent / metrics.total) * 100) : 0}%
          </div>
        </Card>

        <Card className="p-4 bg-indigo-50/50 border-indigo-200 shadow-xs">
          <div className="text-xs text-indigo-700 font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Queued / In-Flight
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {metrics.queued + metrics.sending}
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/50 border-amber-200 shadow-xs">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Retrying
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{metrics.retrying}</div>
        </Card>

        <Card className="p-4 bg-rose-50/50 border-rose-200 shadow-xs">
          <div className="text-xs text-rose-700 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Failed
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{metrics.failed}</div>
        </Card>
      </div>

      {/* Segmented Delivery Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-800">Delivery Status Distribution</span>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Delivered ({metrics.sent})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Queued ({metrics.queued + metrics.sending})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Retrying ({metrics.retrying})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Failed ({metrics.failed})
              </span>
            </div>
          </div>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {completionPercentage}% Delivered
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
          {metrics.total > 0 && (
            <>
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(metrics.sent / metrics.total) * 100}%` }}
                title={`Delivered: ${metrics.sent}`}
              />
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${((metrics.queued + metrics.sending) / metrics.total) * 100}%` }}
                title={`Queued / Sending: ${metrics.queued + metrics.sending}`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${(metrics.retrying / metrics.total) * 100}%` }}
                title={`Retrying: ${metrics.retrying}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${(metrics.failed / metrics.total) * 100}%` }}
                title={`Failed: ${metrics.failed}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Email Subject & Body Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            <span>Customize Outgoing Email Message</span>
          </CardTitle>
          <CardDescription>
            Certificates will be attached as PDF files. You can use variables:
            <span className="font-mono text-indigo-600 font-semibold ml-1">
              &#123;&#123;name&#125;&#125;, &#123;&#123;event_name&#125;&#125;, &#123;&#123;organizer&#125;&#125;, &#123;&#123;date&#125;&#125;, &#123;&#123;certificate_uid&#125;&#125;
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Body Message</label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipient Tracking Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Recipient Delivery Tracking</CardTitle>
              <CardDescription>
                Live delivery status for every participant. Failed sends automatically retry up to 3 times with exponential backoff.
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                All ({recipients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("sent")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "sent" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Delivered ({metrics.sent})
              </button>
              <button
                type="button"
                onClick={() => setFilter("failed")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "failed" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Failed / Retrying ({metrics.failed + metrics.retrying})
              </button>
              <button
                type="button"
                onClick={() => setFilter("pending")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "pending" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Pending ({metrics.queued + metrics.sending})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Certificate ID</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-28">Attempts</th>
                  <th className="py-3 px-4 min-w-[180px]">Delivery Log / Message</th>
                  <th className="py-3 px-4 w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecipients.map((r: any) => {
                  const isSent = r.status === "sent";
                  const isFailed = r.status === "failed";
                  const isRetrying = r.status === "retrying";
                  const isQueued = r.status === "queued";
                  const isSending = r.status === "sending";

                  return (
                    <tr key={r.participantId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.name}</div>
                        <div className="text-[11px] text-slate-500">{r.email}</div>
                      </td>

                      {/* Certificate ID */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {r.certificateUid ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {r.certificateUid}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not generated</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isSent ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <Check className="h-3 w-3" /> Sent
                          </Badge>
                        ) : isRetrying ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Retrying ({r.attemptCount}/3)
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="danger" className="text-[10px] gap-1">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </Badge>
                        ) : isSending ? (
                          <Badge variant="info" className="text-[10px] gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Sending
                          </Badge>
                        ) : isQueued ? (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" /> Queued
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Not Sent
                          </Badge>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {r.attemptCount > 0 ? `${r.attemptCount} / 3` : "—"}
                      </td>

                      {/* Delivery Log */}
                      <td className="py-3 px-4">
                        {isSent && r.sentAt ? (
                          <span className="text-slate-500 text-[11px]">
                            Delivered at {new Date(r.sentAt).toLocaleTimeString()}
                          </span>
                        ) : r.errorMessage ? (
                          <span className="text-rose-600 font-medium text-[11px] line-clamp-1" title={r.errorMessage}>
                            {r.errorMessage}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {(isFailed || isRetrying || isSent) && r.deliveryId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendSingle(r.deliveryId)}
                            isLoading={resendingId === r.deliveryId}
                            className="text-xs h-7 px-2.5"
                          >
                            Resend
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Activity Timeline */}
      {deliveryData.timeline && deliveryData.timeline.length > 0 && (
        <Card className="bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Delivery Activity Timeline</span>
              </CardTitle>
              <Badge variant="outline" className="text-[11px]">
                {deliveryData.timeline.length} Recorded Events
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Chronological log of certificate dispatches, confirmations, and retry events.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {deliveryData.timeline.slice(0, 15).map((item: any, idx: number) => {
                const isSent = item.status === "sent";
                const isFailed = item.status === "failed";

                return (
                  <div key={idx} className="relative flex items-start gap-3">
                    <span
                      className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ${
                        isSent
                          ? "bg-emerald-500 ring-emerald-100"
                          : isFailed
                          ? "bg-rose-500 ring-rose-100"
                          : "bg-amber-500 ring-amber-100"
                      }`}
                    />
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900">
                          {item.recipientName}{" "}
                          <span className="text-slate-500 font-normal">
                            ({item.recipientEmail})
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            isSent ? "success" : isFailed ? "danger" : "warning"
                          }
                          className="text-[10px]"
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                        {item.certificateUid && (
                          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                            UID: {item.certificateUid}
                          </span>
                        )}
                        {item.attemptCount > 0 && (
                          <span className="text-[10px] text-slate-500">
                            Attempt: {item.attemptCount}
                          </span>
                        )}
                        {item.errorMessage && (
                          <span className="text-rose-600 text-[11px] font-medium">
                            {item.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <EmailSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsUpdated={(status) => setEmailSettings(status)}
      />
    </div>
  );
}
