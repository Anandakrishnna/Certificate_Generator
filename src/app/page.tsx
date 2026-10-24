import Link from "next/link";
import { Award, Mail, FileSpreadsheet, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Award className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">CertifyFlow</span>
            <Badge variant="info" className="ml-1 text-[11px]">v1.0</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Bulk Certificate Automation for Event Organizers
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-[1.15]">
          From spreadsheet to delivered certificates in <span className="text-indigo-600">under 10 minutes</span>.
        </h1>

        <p className="mt-5 text-lg text-slate-600 max-w-2xl leading-relaxed">
          Upload your participant list, visually map certificate fields on canvas, bulk render high-resolution PDFs, and automatically email every attendee with real-time delivery tracking.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="shadow-lg shadow-indigo-200 gap-2">
              Start Generating Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              View Demo Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <Card className="hover:border-indigo-300 transition-colors shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle>Spreadsheet Validation</CardTitle>
              <CardDescription>
                Import CSV/XLSX files. Automatic column matching, email syntax verification, and duplicate detection before sending.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-indigo-300 transition-colors shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Award className="h-5 w-5" />
              </div>
              <CardTitle>Visual Canvas Studio</CardTitle>
              <CardDescription>
                Drag-and-drop placeholder mapping for names, dates, and event titles onto custom backgrounds or minimal presets with live preview.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-indigo-300 transition-colors shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle>Automated Delivery</CardTitle>
              <CardDescription>
                Deliver personalized PDFs directly to participant inboxes with exponential backoff retries and real-time delivery tracking.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Built for clubs, hackathons, and workshop hosts</span>
          </div>
          <p>© 2026 CertifyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
