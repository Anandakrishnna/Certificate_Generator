"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
          <p className="text-sm text-slate-500">Welcome back! Sign in to manage your events.</p>
        </div>

        <Card className="shadow-lg border-slate-200/80">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your email and password to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-indigo-950">Quick Demo Account</p>
                <p className="text-[11px] text-indigo-700 font-mono">demo@certifyflow.com / demo1234</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("demo@certifyflow.com");
                  setPassword("demo1234");
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Auto-fill
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="author@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 tracking-wide"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Sign In <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
