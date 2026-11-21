"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, ArrowRight, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please request a new password reset link.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <CardContent className="space-y-4">
        <Alert variant="danger">
          No password reset token was provided. The link may be incomplete or invalid.
        </Alert>
        <div className="text-center pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Request a new reset link <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Password Reset Successful!
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your password has been updated and you are now authenticated. Redirecting you to the dashboard...
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Go to Dashboard Now <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Update Password <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
            >
              Cancel and Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </CardContent>
  );
}

export default function ResetPasswordPage() {
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
          <p className="text-sm text-slate-500">Set a new secure password for your account</p>
        </div>

        <Card className="shadow-lg border-slate-200/80">
          <CardHeader>
            <CardTitle>Create New Password</CardTitle>
            <CardDescription>
              Choose a strong password with at least 6 characters.
            </CardDescription>
          </CardHeader>
          <React.Suspense
            fallback={
              <CardContent>
                <p className="text-xs text-slate-400 py-6 text-center">Loading reset session...</p>
              </CardContent>
            }
          >
            <ResetPasswordForm />
          </React.Suspense>
        </Card>
      </div>
    </div>
  );
}

