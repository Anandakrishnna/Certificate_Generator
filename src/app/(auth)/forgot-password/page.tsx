"use client";

import * as React from "react";
import Link from "next/link";
import { Award, ArrowRight, ArrowLeft, Mail, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    success: boolean;
    message: string;
    emailSent: boolean;
    resetUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process password reset request.");
      }

      setResult({
        success: true,
        message: data.message,
        emailSent: !!data.emailSent,
        resetUrl: data.resetUrl,
      });
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Award className="h-6 w-6" />
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">CertifyFlow</span>
          </Link>
          <p className="text-sm text-slate-500">Reset your password to regain access</p>
        </div>

        <Card className="shadow-lg border-slate-200/80">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter the email address associated with your account and we&apos;ll send you a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            {result ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Reset Link Generated
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {result.emailSent
                      ? `We sent an email with reset instructions to ${email}. Please check your inbox and spam folder.`
                      : `A password reset link has been generated for ${email}.`}
                  </p>
                </div>

                {result.resetUrl && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-700 mb-2">Direct Reset Shortcut:</p>
                    <Link
                      href={result.resetUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-md font-semibold text-xs hover:bg-indigo-700 transition-colors w-full justify-center"
                    >
                      Proceed to Reset Password <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full" isLoading={loading}>
                  Send Reset Link <ArrowRight className="h-4 w-4 ml-1" />
                </Button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

