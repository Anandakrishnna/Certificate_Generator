"use client";

import * as React from "react";
import { Mail, Key, ShieldCheck, Send, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (status: { isConfigured: boolean; provider: string; smtpUser: string }) => void;
}

export function EmailSettingsModal({
  isOpen,
  onClose,
  onSettingsUpdated,
}: EmailSettingsModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [testSuccess, setTestSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [providerType, setProviderType] = React.useState<"gmail" | "custom">("gmail");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpPass, setSmtpPass] = React.useState("");
  const [smtpFrom, setSmtpFrom] = React.useState("");
  const [smtpHost, setSmtpHost] = React.useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [testEmail, setTestEmail] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSaveSuccess(null);
      setTestSuccess(null);
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/email/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.smtpUser) {
          setSmtpUser(data.smtpUser);
        }
        if (data.smtpFrom) {
          setSmtpFrom(data.smtpFrom);
        }
        if (data.smtpHost) {
          setSmtpHost(data.smtpHost);
          if (data.smtpHost !== "smtp.gmail.com") {
            setProviderType("custom");
          }
        }
        if (data.smtpPort) {
          setSmtpPort(data.smtpPort);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(null);
    setTestSuccess(null);

    if (!smtpUser.trim() || !smtpPass.trim()) {
      setError("Please provide both an Email address and Google App Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim(),
          smtpFrom: smtpFrom.trim() || `CertifyFlow <${smtpUser.trim()}>`,
          smtpHost: providerType === "gmail" ? "smtp.gmail.com" : smtpHost.trim(),
          smtpPort: providerType === "gmail" ? "587" : smtpPort.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SMTP credentials");

      setSaveSuccess(data.message || "Credentials saved and activated successfully!");
      if (onSettingsUpdated) {
        onSettingsUpdated({
          isConfigured: true,
          provider: "gmail_smtp",
          smtpUser: smtpUser.trim(),
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setError(null);
    setTestSuccess(null);

    if (!testEmail.trim() || !testEmail.includes("@")) {
      setError("Please enter a valid destination email address for the test send.");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: testEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test dispatch failed.");

      setTestSuccess(data.message || `Test email dispatched to ${testEmail}! Check your inbox.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Outgoing Email (SMTP) Configuration"
      description="Connect real Gmail or custom SMTP credentials to send actual certificates to participants' inboxes."
      maxWidth="lg"
    >
      <div className="space-y-5 pt-1">
        {error && <Alert variant="danger">{error}</Alert>}
        {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
        {testSuccess && <Alert variant="success">{testSuccess}</Alert>}

        {/* Provider Toggle */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => {
              setProviderType("gmail");
              setSmtpHost("smtp.gmail.com");
              setSmtpPort("587");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              providerType === "gmail"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Gmail SMTP (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setProviderType("custom")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              providerType === "custom"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Custom SMTP (Host & Port)
          </button>
        </div>

        {/* Gmail Setup Instructions Banner */}
        {providerType === "gmail" && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>How to get your Gmail App Password:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
              <li>Enable 2-Step Verification on your Google Account.</li>
              <li>
                Open{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-700 underline inline-flex items-center gap-0.5 hover:text-indigo-900"
                >
                  Google App Passwords <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Create an app named <strong>CertifyFlow</strong> and copy the generated 16-character password.</li>
              <li>Paste it into the App Password field below.</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label={providerType === "gmail" ? "Your Gmail Address" : "SMTP Username / Email"}
              type="email"
              placeholder="organizer@gmail.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              required
            />

            <Input
              label={providerType === "gmail" ? "16-Character App Password" : "SMTP Password"}
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              helperText="Do not use your main account password."
              required
            />
          </div>

          {providerType === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="SMTP Host"
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                required
              />
              <Input
                label="SMTP Port"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                required
              />
            </div>
          )}

          <Input
            label="Sender Name & From Address (Optional)"
            placeholder={`CertifyFlow <${smtpUser || "organizer@gmail.com"}>`}
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            helperText="The friendly name shown to recipients in their email inbox."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={loading}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Save & Activate Credentials
            </Button>
          </div>
        </form>

        {/* Live Test Section */}
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-indigo-600" /> Verify with a Test Email
            </h4>
            <span className="text-[11px] text-slate-500">Send an instant test to confirm delivery</span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Enter your personal email to receive test message..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              isLoading={testing}
              className="text-xs gap-1.5 flex-shrink-0"
            >
              <Send className="h-3.5 w-3.5 text-indigo-600" /> Send Test
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
